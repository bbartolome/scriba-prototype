// Redaction for operational logs on stdout. Every stdout line of the app passes through redact (stdout-logger.ts).
const PLACEHOLDER = '[redacted]';

// The Authorization rule, case-insensitive. The name, an optional quote and colon, and an optional Bearer or Basic scheme
// are kept; the credential runs to the first whitespace, quote or escape character.
const AUTHORIZATION =
  // eslint-disable-next-line no-control-regex -- \x1b is the ANSI escape character, which ends a credential
  /(authorization['"]?\s*:\s*['"]?(?:(?:bearer|basic)\s+)?)[^\s'"\x1b]+/gi;

// The common key shape, such as an sk- key.
const KEY_SHAPE = /\bsk-[A-Za-z0-9_-]{8,}/g;

// One pattern over every known key value, longest first, so a value that contains another is replaced whole.
// A single pass means the placeholder is never split by a later value.
let knownPattern: RegExp | undefined;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Replaces the registry of known key values. Empty values are ignored.
export function setKnownSecrets(values: readonly string[]): void {
  const sorted = values
    .filter((value) => value.length > 0)
    .sort((a, b) => b.length - a.length);
  knownPattern =
    sorted.length === 0
      ? undefined
      : new RegExp(sorted.map(escapeRegExp).join('|'), 'g');
}

// Applies, in order: the known key values, the Authorization rule, and the key-shape rule.
export function redact(text: string): string {
  let result = knownPattern ? text.replace(knownPattern, PLACEHOLDER) : text;
  result = result.replace(
    AUTHORIZATION,
    (_match: string, prefix: string) => `${prefix}${PLACEHOLDER}`,
  );
  return result.replace(KEY_SHAPE, PLACEHOLDER);
}
