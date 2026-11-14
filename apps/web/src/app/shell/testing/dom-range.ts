/**
 * Range geometry stubs for the Shell's specs. jsdom has no
 * `Range.getClientRects` or `Range.getBoundingClientRect`, and CodeMirror's
 * measure pass calls them when it draws a view. The stubs return empty
 * geometry, so a render completes; no spec reads a position.
 */

type RangeMethod = 'getClientRects' | 'getBoundingClientRect';

const METHODS: readonly RangeMethod[] = [
  'getClientRects',
  'getBoundingClientRect',
];

const previous = new Map<RangeMethod, unknown>();

function emptyRect(): DOMRect {
  return {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    toJSON: () => ({}),
  } as DOMRect;
}

function emptyRects(): DOMRectList {
  return Object.assign([], { item: () => null }) as unknown as DOMRectList;
}

/** Replaces the two Range geometry methods with empty results. */
export function stubRangeRects(): void {
  const proto = Range.prototype as unknown as Record<RangeMethod, unknown>;
  for (const method of METHODS) {
    previous.set(method, proto[method]);
  }
  proto.getClientRects = emptyRects;
  proto.getBoundingClientRect = emptyRect;
}

/** Restores the Range geometry methods that `stubRangeRects` replaced. */
export function restoreRangeRects(): void {
  const proto = Range.prototype as unknown as Record<RangeMethod, unknown>;
  for (const method of METHODS) {
    if (!previous.has(method)) continue;
    const value = previous.get(method);
    if (value === undefined) {
      delete proto[method];
    } else {
      proto[method] = value;
    }
  }
  previous.clear();
}
