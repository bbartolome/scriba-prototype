import { readFileSync } from 'node:fs';
import { request as httpRequest, type IncomingHttpHeaders } from 'node:http';
import { join } from 'node:path';
import type { TestApp } from './create-test-app';

// One request. Host is always explicit, because fetch cannot set it.
export interface RequestOptions {
  host: string;
  path: string;
  method?: 'GET' | 'POST' | 'OPTIONS';
  origin?: string; // sent as given when set, 'null' included
  cookie?: string; // a `name=value` pair, sent as the Cookie header
  body?: string; // sent as given
  contentType?: string; // default application/json when a body is sent
  headers?: Record<string, string>;
  // An event stream resolves at its headers and its socket is dropped. Any other reply is read to its end.
  headersOnly?: boolean;
}

export interface Reply {
  status: number;
  headers: IncomingHttpHeaders;
  body: string;
}

// Sends one request over node:http, with agent: false so each request closes its own socket.
export function send(baseUrl: string, options: RequestOptions): Promise<Reply> {
  const { hostname, port } = new URL(baseUrl);
  const headers: Record<string, string> = { Host: options.host };
  if (options.origin !== undefined) headers.Origin = options.origin;
  if (options.cookie !== undefined) headers.Cookie = options.cookie;
  if (options.body !== undefined) {
    headers['Content-Type'] = options.contentType ?? 'application/json';
    headers['Content-Length'] = String(Buffer.byteLength(options.body));
  }
  Object.assign(headers, options.headers);
  return new Promise((resolve, reject) => {
    const request = httpRequest(
      {
        hostname,
        port,
        path: options.path,
        method: options.method ?? 'GET',
        headers,
        agent: false,
      },
      (response) => {
        const stream = String(response.headers['content-type'] ?? '');
        if (
          options.headersOnly === true &&
          stream.startsWith('text/event-stream')
        ) {
          resolve({
            status: response.statusCode ?? 0,
            headers: response.headers,
            body: '',
          });
          response.destroy();
          return;
        }
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('error', reject);
        response.on('end', () => {
          resolve({
            status: response.statusCode ?? 0,
            headers: response.headers,
            body: Buffer.concat(chunks).toString('utf8'),
          });
        });
      },
    );
    request.on('error', reject);
    request.end(options.body);
  });
}

// The `name=value` pair the handshake sets, taken the way a browser takes it: the setup URL from disk,
// sent to the handshake with Host 127.0.0.1:8080. The cookie is never derived here.
export async function sessionCookie(
  app: TestApp,
  libraryDir: string,
): Promise<string> {
  const setupUrl = new URL(
    readFileSync(join(libraryDir, '.scriba', 'setup-url'), 'utf8').trim(),
  );
  const reply = await send(app.baseUrl, {
    host: '127.0.0.1:8080',
    path: `${setupUrl.pathname}${setupUrl.search}`,
  });
  const [first] = reply.headers['set-cookie'] ?? [];
  if (reply.status !== 303 || first === undefined) {
    throw new Error(
      `The handshake answered ${reply.status} without a session cookie.`,
    );
  }
  return first.split(';')[0] ?? '';
}
