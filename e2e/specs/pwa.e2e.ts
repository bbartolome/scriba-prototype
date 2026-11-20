import { execFileSync } from 'node:child_process';
import { createHash, X509Certificate } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { request as httpRequest } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import { tmpdir } from 'node:os';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';
import {
  chromium,
  expect,
  test,
  type BrowserContext,
  type Page,
  type Response as PwResponse,
} from '@playwright/test';
import {
  HANDSHAKE_ROUTE,
  SETUP_AUTH_ERROR_STATUS,
  SETUP_PAGE_PATH,
} from '@bbartolome/scriba-contracts/setup-auth';
import {
  EVENTS_ROUTE,
  HEALTHZ_ROUTE,
  VERSION_ROUTE,
} from '@bbartolome/scriba-contracts/platform';

// Specs in this file run with a service worker. Every other spec blocks it (playwright.config.ts).
test.use({ serviceWorkers: 'allow' });

const apiPort = 8080;
const excludedPrefixes = ['/api/', '/healthz', '/events', '/setup'];

type ResponseRecord = {
  path: string;
  fromServiceWorker: boolean;
  serviceWorkerResponseSource?: string;
};

// Angular registers the worker when the app is stable (up to 30 s), then it claims the open page.
async function waitForController(page: Page): Promise<void> {
  const deadline = Date.now() + 60_000;
  const reloadAt = Date.now() + 30_000;
  let reloaded = false;
  while (Date.now() < deadline) {
    const controlled = await page.evaluate(
      () => navigator.serviceWorker.controller !== null,
    );
    if (controlled) return;
    if (!reloaded && Date.now() > reloadAt) {
      reloaded = true;
      await page.reload();
    }
    await page.waitForTimeout(500);
  }
  throw new Error('no service worker controls the page after 60 s');
}

function readSetupUrl(): Promise<string> {
  return readFile(
    join(process.env.SCRIBA_E2E_LIBRARY!, '.scriba', 'setup-url'),
    'utf8',
  ).then((text) => text.trim());
}

function recordResponses(page: Page, records: ResponseRecord[]): Promise<void> {
  return page
    .context()
    .newCDPSession(page)
    .then(async (cdp) => {
      await cdp.send('Network.enable');
      cdp.on(
        'Network.responseReceived',
        (event: {
          response: {
            url: string;
            fromServiceWorker?: boolean;
            serviceWorkerResponseSource?: string;
          };
        }) => {
          const response = event.response;
          records.push({
            path: new URL(response.url).pathname,
            fromServiceWorker: Boolean(response.fromServiceWorker),
            serviceWorkerResponseSource: response.serviceWorkerResponseSource,
          });
        },
      );
    });
}

test.describe('pwa', () => {
  test('criterion 1: installable on loopback and on an HTTPS tailnet-style name, standalone display', async () => {
    const workDir = await mkdtemp(join(tmpdir(), 'scriba-shl17-tls-'));
    const tlsName = 'scriba.shl17-test.ts.net';
    const keyPath = join(workDir, 'key.pem');
    const certPath = join(workDir, 'cert.pem');
    let context: BrowserContext | undefined;
    let proxy: import('node:https').Server | undefined;
    try {
      try {
        execFileSync(
          'openssl',
          [
            'req',
            '-x509',
            '-newkey',
            'rsa:2048',
            '-nodes',
            '-days',
            '1',
            '-subj',
            `/CN=${tlsName}`,
            '-addext',
            `subjectAltName=DNS:${tlsName}`,
            '-keyout',
            keyPath,
            '-out',
            certPath,
          ],
          { stdio: 'ignore' },
        );
      } catch (error) {
        throw new Error('openssl is needed to make the test certificate', {
          cause: error,
        });
      }
      const certPem = await readFile(certPath, 'utf8');
      const keyPem = await readFile(keyPath, 'utf8');
      const spki = new X509Certificate(certPem).publicKey.export({
        type: 'spki',
        format: 'der',
      });
      const spkiHash = createHash('sha256').update(spki).digest('base64');

      // The HTTPS name in front of the loopback API, as `tailscale serve` is (deploy/compose.yaml).
      proxy = createHttpsServer({ key: keyPem, cert: certPem }, (req, res) => {
        const upstream = httpRequest(
          {
            host: '127.0.0.1',
            port: apiPort,
            method: req.method,
            path: req.url,
            headers: { ...req.headers, host: `127.0.0.1:${apiPort}` },
          },
          (upstreamRes) => {
            res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers);
            upstreamRes.pipe(res);
          },
        );
        upstream.on('error', () => {
          if (!res.headersSent) res.writeHead(502);
          res.end();
        });
        req.pipe(upstream);
      });
      await new Promise<void>((resolve) =>
        proxy!.listen(0, '127.0.0.1', resolve),
      );
      const proxyPort = (proxy.address() as AddressInfo).port;

      const channelOrExecutable = process.env.SCRIBA_E2E_CHROMIUM
        ? { executablePath: process.env.SCRIBA_E2E_CHROMIUM }
        : { channel: 'chromium' as const };
      // A persistent context is a secure, installable context. The headless shell answers no check (F27).
      context = await chromium.launchPersistentContext(
        join(workDir, 'profile'),
        {
          ...channelOrExecutable,
          headless: true,
          args: [
            `--host-resolver-rules=MAP ${tlsName}:443 127.0.0.1:${proxyPort}`,
            `--ignore-certificate-errors-spki-list=${spkiHash}`,
          ],
        },
      );
      const page = context.pages()[0] ?? (await context.newPage());
      const cdp = await context.newCDPSession(page);

      // (a) Negative control: a document with no manifest must report an error.
      await page.goto(`http://127.0.0.1:${apiPort}${HEALTHZ_ROUTE}`);
      const control = await cdp.send('Page.getInstallabilityErrors');
      const controlIds = (
        control.installabilityErrors as { errorId: string }[]
      ).map((error) => error.errorId);
      if (controlIds.length === 0) {
        throw new Error('the browser runs no installability check');
      }
      expect(controlIds).toContain('no-manifest');

      // (b) Loopback.
      await page.goto(`http://127.0.0.1:${apiPort}/`);
      await waitForController(page);
      const loopback = await cdp.send('Page.getInstallabilityErrors');
      expect(loopback.installabilityErrors).toEqual([]);
      const loopbackManifest = await cdp.send('Page.getAppManifest');
      expect(loopbackManifest.errors).toEqual([]);

      // (c) HTTPS name.
      await page.goto(`https://${tlsName}/`);
      await waitForController(page);
      const tailnet = await cdp.send('Page.getInstallabilityErrors');
      expect(tailnet.installabilityErrors).toEqual([]);

      // (d) Standalone display, icons that answer as PNG.
      const manifest = await page.evaluate(async () => {
        const response = await fetch('/manifest.webmanifest');
        return { status: response.status, body: await response.json() };
      });
      expect(manifest.status).toBe(200);
      expect(manifest.body.display).toBe('standalone');
      expect(manifest.body.start_url).toBe('/');
      expect(manifest.body.scope).toBe('/');
      const icons: { src: string; sizes: string; purpose?: string }[] =
        manifest.body.icons;
      expect(icons.some((icon) => icon.sizes === '192x192')).toBe(true);
      expect(
        icons.some(
          (icon) =>
            icon.sizes === '512x512' &&
            (icon.purpose ?? 'any').split(' ').includes('any'),
        ),
      ).toBe(true);
      expect(
        icons.some(
          (icon) =>
            icon.sizes === '512x512' &&
            (icon.purpose ?? '').split(' ').includes('maskable'),
        ),
      ).toBe(true);
      for (const icon of icons) {
        const served = await page.evaluate(async (src) => {
          const response = await fetch(src);
          return {
            status: response.status,
            type: response.headers.get('content-type'),
          };
        }, icon.src);
        expect(served.status, icon.src).toBe(200);
        expect(served.type, icon.src).toContain('image/png');
      }
    } finally {
      await context?.close();
      await new Promise<void>((resolve) =>
        proxy ? proxy.close(() => resolve()) : resolve(),
      );
      await rm(workDir, { recursive: true, force: true });
    }
  });

  test('criterion 2: excluded paths are never served from cache, and streaming works after install', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const records: ResponseRecord[] = [];
    await recordResponses(page, records);

    await page.goto('/');
    await waitForController(page);
    await page.reload();
    await waitForController(page);

    // (a) The token URL reaches the server and sets the cookie.
    const setupUrl = await readSetupUrl();
    await page.goto(setupUrl);
    expect(new URL(page.url()).pathname).not.toBe(HANDSHAKE_ROUTE);
    const afterToken = await page.evaluate(async (route) => {
      const response = await fetch(route);
      return response.status;
    }, VERSION_ROUTE);
    expect(afterToken).toBe(200);

    // (b) A wrong token answers SETUP_TOKEN_INVALID.
    const wrong: PwResponse | null = await page.goto(
      `${HANDSHAKE_ROUTE}?token=wrong`,
    );
    expect(wrong?.status()).toBe(SETUP_AUTH_ERROR_STATUS.SETUP_TOKEN_INVALID);

    // (c) The setup page answers 200.
    const setupPage = await page.goto(SETUP_PAGE_PATH);
    expect(setupPage?.status()).toBe(200);

    // (d) The health route answers JSON, not the shell.
    const health = await page.goto(HEALTHZ_ROUTE);
    expect(health?.status()).toBe(200);
    expect((await health?.json())?.status).toBe('ok');

    // (e) Back on the app: the JSON routes answer 200.
    await page.goto('/');
    await waitForController(page);
    const json = await page.evaluate(
      async ([healthz, version]) => {
        const a = await fetch(healthz, { cache: 'no-store' });
        const b = await fetch(version);
        return [a.status, b.status];
      },
      [HEALTHZ_ROUTE, VERSION_ROUTE] as const,
    );
    expect(json).toEqual([200, 200]);

    // (f) Streaming: the hello envelope arrives on a new EventSource.
    const hello = await page.evaluate(
      (route) =>
        new Promise<{ module: string; type: string } | 'timeout'>((resolve) => {
          const source = new EventSource(route);
          const timer = setTimeout(() => {
            source.close();
            resolve('timeout');
          }, 10_000);
          source.onmessage = (event) => {
            clearTimeout(timer);
            source.close();
            resolve(JSON.parse(event.data));
          };
        }),
      EVENTS_ROUTE,
    );
    expect(hello).not.toBe('timeout');
    expect(hello).toMatchObject({ module: 'platform', type: 'hello' });

    // (g) Source check: each excluded prefix was fetched, none came from cache storage.
    for (const prefix of excludedPrefixes) {
      const matching = records.filter((record) =>
        prefix.endsWith('/')
          ? record.path.startsWith(prefix)
          : record.path === prefix,
      );
      expect(matching.length, prefix).toBeGreaterThan(0);
      for (const record of matching) {
        expect(record.serviceWorkerResponseSource, record.path).not.toBe(
          'cache-storage',
        );
      }
    }
    expect(
      records.some(
        (record) => record.serviceWorkerResponseSource === 'cache-storage',
      ),
    ).toBe(true);

    // (h) The cache holds no excluded path, and it holds the shell.
    const cached = await page.evaluate(async () => {
      const urls: string[] = [];
      for (const name of await caches.keys()) {
        const cache = await caches.open(name);
        for (const request of await cache.keys()) {
          urls.push(new URL(request.url).pathname);
        }
      }
      return urls;
    });
    for (const path of cached) {
      for (const prefix of excludedPrefixes) {
        expect(
          prefix.endsWith('/') ? path.startsWith(prefix) : path === prefix,
          path,
        ).toBe(false);
      }
    }
    expect(cached).toContain('/index.html');
    expect(cached.some((path) => /\/main-[^/]+\.js$/.test(path))).toBe(true);
  });
});
