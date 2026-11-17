import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, it } from 'vitest';
import { VERSION_ROUTE } from '@bbartolome/scriba-contracts/platform';
import {
  IDENTITY_ROUTE,
  TAILSCALE_STATUS_ROUTE,
  tailscaleStatusSchema,
} from '@bbartolome/scriba-contracts/setup-auth';
import { createTestApp, type TestApp } from './create-test-app';
import { send, sessionCookie } from './guard-request';

const STATIC_ROOT = resolve(__dirname, 'fixtures/static');
const LOOPBACK_HOST = '127.0.0.1:8080';
const TAILNET_NAME = 'scriba-1.tail1234.ts.net';
const LOGIN_HEADER = { 'Tailscale-User-Login': 'ada@example.com' };

function codeOf(reply: { body: string }): string | undefined {
  return (JSON.parse(reply.body) as { error?: { code?: string } }).error?.code;
}

it('criterion 1 (SAU-21): without a socket, status reads unavailable, loopback works, and the tailnet Host gets 403 AUTH_HOST_REJECTED', async () => {
  const library = mkdtempSync(join(tmpdir(), 'scriba-gate-lib-'));
  const second = mkdtempSync(join(tmpdir(), 'scriba-gate-sock-'));
  let app: TestApp | undefined;
  try {
    app = await createTestApp({
      libraryDir: library,
      staticRoot: STATIC_ROOT,
      env: { SCRIBA_TS_SOCKET: join(second, 'missing.sock') },
    });
    const cookie = await sessionCookie(app, library);

    // (a) Status reads unavailable with no socket.
    const status = await send(app.baseUrl, {
      host: LOOPBACK_HOST,
      path: TAILSCALE_STATUS_ROUTE,
      cookie,
    });
    expect(status.status).toBe(200);
    expect(tailscaleStatusSchema.parse(JSON.parse(status.body))).toStrictEqual({
      available: false,
      backendState: 'NoState',
    });

    // (b) Loopback still works.
    const version = await send(app.baseUrl, {
      host: LOOPBACK_HOST,
      path: VERSION_ROUTE,
      cookie,
    });
    expect(version.status).toBe(200);

    // (c) The tailnet Host is not allowed, with or without a login header.
    const withLogin = await send(app.baseUrl, {
      host: TAILNET_NAME,
      path: VERSION_ROUTE,
      headers: LOGIN_HEADER,
    });
    expect(withLogin.status).toBe(403);
    expect(codeOf(withLogin)).toBe('AUTH_HOST_REJECTED');

    const noLogin = await send(app.baseUrl, {
      host: TAILNET_NAME,
      path: VERSION_ROUTE,
    });
    expect(noLogin.status).toBe(403);
    expect(codeOf(noLogin)).toBe('AUTH_HOST_REJECTED');

    const identity = await send(app.baseUrl, {
      host: TAILNET_NAME,
      path: IDENTITY_ROUTE,
      headers: LOGIN_HEADER,
    });
    expect(identity.status).toBe(403);
    expect(codeOf(identity)).toBe('AUTH_HOST_REJECTED');
  } finally {
    await app?.close();
    rmSync(library, { recursive: true, force: true });
    rmSync(second, { recursive: true, force: true });
  }
});
