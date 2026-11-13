import { BootError, type ScribaEnv } from '../platform/platform.module';

// Injection token for the policy the guard reads. The provider is built by buildRequestPolicy.
export const REQUEST_POLICY = Symbol('REQUEST_POLICY');

// The Host allowlist and the origin each Host must send on a mutation.
export interface RequestPolicy {
  // The origin that a mutation with this Host must send, or undefined when the Host is not allowed.
  originFor(host: string | undefined): string | undefined;
}

// The loopback Hosts and the dev origins, built from the boot env. A bad dev origin throws a BootError.
export function buildRequestPolicy(env: ScribaEnv): RequestPolicy {
  const origins = new Map<string, string>();
  const port = env.SCRIBA_PORT;
  origins.set(`127.0.0.1:${port}`, `http://127.0.0.1:${port}`);
  origins.set(`localhost:${port}`, `http://localhost:${port}`);
  for (const origin of parseDevOrigins(env.SCRIBA_DEV_ORIGINS)) {
    origins.set(new URL(origin).host, origin);
  }
  return {
    originFor: (host) => (host === undefined ? undefined : origins.get(host)),
  };
}

// The path of a request without its query. Express rewrites req.url inside a mounted handler, so originalUrl is read.
export function requestPath(originalUrl: string): string {
  const query = originalUrl.indexOf('?');
  return query === -1 ? originalUrl : originalUrl.slice(0, query);
}

// The list is comma separated. Blank means no dev origins.
function parseDevOrigins(raw: string): string[] {
  if (raw.trim() === '') return [];
  return raw.split(',').map((entry) => {
    const origin = entry.trim();
    if (!isExplicitOrigin(origin)) {
      throw new BootError(
        `Invalid SCRIBA_DEV_ORIGINS "${raw}": each entry must be an http or https origin with an explicit port and no path, for example http://localhost:4200.`,
      );
    }
    return origin;
  });
}

// True for an http or https origin with a port, and nothing after it: no path, user, query or fragment.
function isExplicitOrigin(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return (
    (url.protocol === 'http:' || url.protocol === 'https:') &&
    url.port !== '' &&
    url.origin === value
  );
}
