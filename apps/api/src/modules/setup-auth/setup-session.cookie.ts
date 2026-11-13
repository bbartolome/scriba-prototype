// 400 days in seconds, the longest Max-Age browsers keep.
export const SESSION_MAX_AGE_SECONDS = 400 * 86400;

const LOOPBACK_NAMES = ['127.0.0.1', 'localhost'];

// True for the loopback names, with or without a port, in any letter case. The tailnet name is not loopback.
export function isLoopbackHost(host: string | undefined): boolean {
  if (host === undefined) return false;
  const name = host.replace(/:\d+$/, '').toLowerCase();
  return LOOPBACK_NAMES.includes(name);
}

// Host-only (no Domain), HttpOnly, SameSite=Strict, Path=/, no Secure (the matrix fallback in modules/setup-auth.md).
export function sessionCookieHeader(name: string, value: string): string {
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_MAX_AGE_SECONDS}`;
}

// Expires the cookie for this browser. Path=/ must match the cookie it replaces, or the browser keeps it.
export function expiredSessionCookieHeader(name: string): string {
  return `${name}=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict`;
}

// The value of the first cookie named `name` in a Cookie header, or undefined.
export function cookieValue(
  header: string | undefined,
  name: string,
): string | undefined {
  if (header === undefined) return undefined;
  for (const pair of header.split(';')) {
    const equals = pair.indexOf('=');
    if (equals === -1) continue;
    if (pair.slice(0, equals).trim() === name) {
      return pair.slice(equals + 1).trim();
    }
  }
  return undefined;
}
