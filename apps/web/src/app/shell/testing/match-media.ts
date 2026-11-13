/**
 * A `matchMedia` stub for the Shell's specs. It evaluates the `and`-joined
 * `min-width`, `max-width` and `orientation` terms that the CDK sends. Any
 * other query, such as `(prefers-reduced-motion)`, matches nothing.
 */

interface Size {
  readonly width: number;
  readonly height: number;
}

type Listener = (event: { matches: boolean; media: string }) => void;

interface StubQueryList {
  readonly media: string;
  matches: boolean;
  readonly listeners: Set<Listener>;
  addListener(listener: Listener): void;
  removeListener(listener: Listener): void;
  addEventListener(type: string, listener: Listener): void;
  removeEventListener(type: string, listener: Listener): void;
}

type MatchMedia = (query: string) => StubQueryList;

const TERM = /^\((min-width|max-width|orientation):\s*([^)]+)\)$/;

let size: Size = { width: 0, height: 0 };
let lists: StubQueryList[] = [];
let original: MatchMedia | undefined;

function evaluate(query: string, { width, height }: Size): boolean {
  return query.split(' and ').every((term) => {
    const match = TERM.exec(term.trim());
    if (!match) return false;
    const [, feature = '', value = ''] = match;
    switch (feature) {
      case 'min-width':
        return width >= parseFloat(value);
      case 'max-width':
        return width <= parseFloat(value);
      case 'orientation':
        return (height >= width ? 'portrait' : 'landscape') === value.trim();
      default:
        return false;
    }
  });
}

function createList(media: string): StubQueryList {
  const listeners = new Set<Listener>();
  return {
    media,
    matches: evaluate(media, size),
    listeners,
    addListener: (listener) => listeners.add(listener),
    removeListener: (listener) => listeners.delete(listener),
    addEventListener: (_type, listener) => listeners.add(listener),
    removeEventListener: (_type, listener) => listeners.delete(listener),
  };
}

/**
 * Installs `window.matchMedia` at this size and returns `resize`. Call it in
 * `beforeEach`, before TestBed creates the CDK's `MediaMatcher`.
 */
export function stubMatchMedia(
  width: number,
  height: number,
): (width: number, height: number) => void {
  const win = window as unknown as { matchMedia?: MatchMedia };
  original = win.matchMedia;
  size = { width, height };
  lists = [];
  win.matchMedia = (query: string) => {
    const list = createList(query);
    lists.push(list);
    return list;
  };
  return resize;
}

/**
 * Changes the size. Each query's `matches` is set first, then each listener is
 * called, so a listener that reads `matches` sees the new value. The CDK then
 * delivers the change after `debounceTime(0)`, so a test waits one macrotask.
 */
function resize(width: number, height: number): void {
  size = { width, height };
  for (const list of lists) list.matches = evaluate(list.media, size);
  for (const list of lists) {
    for (const listener of list.listeners) {
      listener({ matches: list.matches, media: list.media });
    }
  }
}

/** Removes the stub and restores the previous `matchMedia`, if there was one. */
export function restoreMatchMedia(): void {
  const win = window as unknown as { matchMedia?: MatchMedia };
  if (original) {
    win.matchMedia = original;
  } else {
    delete win.matchMedia;
  }
  original = undefined;
  lists = [];
}
