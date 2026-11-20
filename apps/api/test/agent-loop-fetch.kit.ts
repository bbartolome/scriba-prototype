import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Global, Module, type Type } from '@nestjs/common';
import {
  DEFAULT_FETCH_POLICY,
  FETCH_POLICY,
  type FetchPolicy,
} from '../src/modules/agent-loop/tools/fetch-page';

// A test-only seam for fetch_page (AGL-22, plan P17 and P18; Navigator decision, option A). It is never in the
// composed app. It provides the FetchPolicy with the test values merged over the defaults, and the allowance that lets
// a fetch reach the stub's own 127.0.0.1 address and port. AGL-23 imports this file and does not copy it.
export function agentLoopFetchKitModule(
  policy: Partial<FetchPolicy>,
): Type<unknown> {
  @Global()
  @Module({
    providers: [
      {
        provide: FETCH_POLICY,
        useValue: { ...DEFAULT_FETCH_POLICY, ...policy },
      },
    ],
    exports: [FETCH_POLICY],
  })
  class AgentLoopFetchKitModule {}
  return AgentLoopFetchKitModule;
}

// The page the stub serves at /page. Its text, once the HTML is stripped, is FETCHED_SENTENCE.
export const FETCHED_SENTENCE = 'Harbour traffic doubled in 1900 & so did the oats.';

const PAGE_HTML = [
  '<!doctype html>',
  '<html>',
  '<head>',
  '<style>p { color: red; }</style>',
  "<script>var secret = 'do not show';</script>",
  '</head>',
  '<body>',
  '<!-- hidden comment -->',
  `<p>${FETCHED_SENTENCE.replace('&', '&amp;')}</p>`,
  '</body>',
  '</html>',
].join('\n');

// The stub of the criteria: a node:http server on 127.0.0.1 with port 0. It records the hits per path and closes
// its connections and pending timers when it closes.
export interface PageStub {
  port: number;
  hitsOf: (path: string) => number;
  close: () => Promise<void>;
}

export async function startPageStub(): Promise<PageStub> {
  const hits = new Map<string, number>();
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const server: Server = createServer((req, res) => {
    res.on('error', () => undefined);
    const path = new URL(req.url ?? '/', 'http://127.0.0.1').pathname;
    hits.set(path, (hits.get(path) ?? 0) + 1);
    const port = (server.address() as AddressInfo).port;
    if (path === '/page') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(PAGE_HTML);
    } else if (path === '/redirect-private') {
      res.writeHead(302, { location: 'http://[fd7a:115c:a1e0::1]/page' });
      res.end();
    } else if (path === '/redirect-localhost') {
      res.writeHead(302, { location: `http://localhost:${port}/page` });
      res.end();
    } else if (path === '/big') {
      // More than the test's byte cap, streamed in pieces.
      res.writeHead(200, { 'content-type': 'text/plain' });
      for (let i = 0; i < 16; i += 1) res.write('a'.repeat(1024));
      res.end();
    } else if (path === '/slow') {
      // Answers only after the test's time cap has passed.
      const timer = setTimeout(() => {
        timers.delete(timer);
        if (!res.destroyed) {
          res.writeHead(200, { 'content-type': 'text/plain' });
          res.end('late');
        }
      }, 2000);
      timers.add(timer);
    } else {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('not found');
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const { port } = server.address() as AddressInfo;
  return {
    port,
    hitsOf: (path) => hits.get(path) ?? 0,
    close: async () => {
      for (const timer of timers) clearTimeout(timer);
      timers.clear();
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}
