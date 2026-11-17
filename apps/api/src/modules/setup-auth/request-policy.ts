import type { TailscaleStatus } from '@bbartolome/scriba-contracts/setup-auth';
import { BootError, type ScribaEnv } from '../platform/platform.module';

// Injection token for the policy the guard reads. The provider is built by buildRequestPolicy.
export const REQUEST_POLICY = Symbol('REQUEST_POLICY');

// The Tailscale status the tailnet Host is read from. TailscaleStatusService satisfies it structurally.
export interface TailnetSource {
  status(): Promise<TailscaleStatus>;
  refresh(): Promise<TailscaleStatus>;
}

// An admitted Host. The origin is what a mutation on it must send. tailnet is true for the tailnet Host.
export interface HostEntry {
  origin: string;
  tailnet: boolean;
}

// The Host allowlist and the origin each Host must send on a mutation.
export interface RequestPolicy {
  // The entry for this Host, or undefined when the Host is not allowed.
  admit(host: string | undefined): Promise<HostEntry | undefined>;
}

// The loopback Hosts and the dev origins, built from the boot env. A bad dev origin throws a BootError.
// An unknown Host is read from Tailscale status: one cached read, then at most one rate-limited refresh.
export function buildRequestPolicy(
  env: ScribaEnv,
  tailnet: TailnetSource,
): RequestPolicy {
  const origins = new Map<string, string>();
  const port = env.SCRIBA_PORT;
  origins.set(`127.0.0.1:${port}`, `http://127.0.0.1:${port}`);
  origins.set(`localhost:${port}`, `http://localhost:${port}`);
  for (const origin of parseDevOrigins(env.SCRIBA_DEV_ORIGINS)) {
    origins.set(new URL(origin).host, origin);
  }
  return {
    admit: async (host) => {
      if (host === undefined) return undefined;
      const fixed = origins.get(host);
      if (fixed !== undefined) return { origin: fixed, tailnet: false };
      return (
        tailnetEntryFor(await tailnet.status(), host) ??
        tailnetEntryFor(await tailnet.refresh(), host)
      );
    },
  };
}

// The tailnet Host is admitted only when Tailscale is Running with a DNS name, and the Host is that name, with or without :443.
// Every other state gives no tailnet entry.
export function tailnetEntryFor(
  status: TailscaleStatus,
  host: string,
): HostEntry | undefined {
  if (
    !status.available ||
    status.backendState !== 'Running' ||
    status.dnsName === undefined
  ) {
    return undefined;
  }
  const name = status.dnsName;
  if (host !== name && host !== `${name}:443`) return undefined;
  return { origin: `https://${name}`, tailnet: true };
}

// Refuses a bad SCRIBA_DEV_ORIGINS with a BootError. Called before Nest code runs, so a bad value exits early.
export function checkDevOrigins(raw: string): void {
  parseDevOrigins(raw);
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
