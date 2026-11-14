import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DiffView } from './index';
import { restoreMatchMedia, stubMatchMedia } from './testing/match-media';

// The seam: the rendered DiffView in a host that binds signals to its inputs, as a consumer does.
@Component({
  imports: [DiffView],
  template: `
    <app-diff-view
      [path]="path()"
      [base]="base()"
      [proposed]="proposed()"
      [conflict]="conflict()"
      [conflictMessage]="conflictMessage()"
    />
  `,
})
class Host {
  readonly path = signal('notes/chapter.md');
  readonly base = signal('');
  readonly proposed = signal('');
  readonly conflict = signal(false);
  readonly conflictMessage = signal<string | undefined>(undefined);
}

type Size = readonly [number, number];

const PHONE: Size = [390, 844];
const TABLET: Size = [820, 1180];
const DESKTOP: Size = [1280, 800];

/** The two layouts the criteria use. A phone gives unified; a desktop gives side by side. */
const LAYOUTS = [
  { name: 'unified', size: PHONE },
  { name: 'side by side', size: DESKTOP },
] as const;

interface Case {
  readonly name: string;
  readonly base: string;
  readonly proposed: string;
  readonly check: (root: HTMLElement) => void;
}

/** Each case in each layout, as `it.each` rows: [case name, layout name, size, case]. */
function bothLayouts<T extends Case>(
  cases: readonly T[],
): Array<[string, string, Size, T]> {
  return cases.flatMap((c) =>
    LAYOUTS.map((l): [string, string, Size, T] => [c.name, l.name, l.size, c]),
  );
}

let resize: (width: number, height: number) => void;

beforeEach(() => {
  resize = stubMatchMedia(390, 844);
});

afterEach(() => {
  restoreMatchMedia();
});

interface Rendered {
  readonly fixture: ComponentFixture<Host>;
  readonly host: Host;
  readonly root: HTMLElement;
}

/** Renders the host at a size. The size is set before the host is created, so the device class is that size. */
async function render(
  size: Size,
  base: string,
  proposed: string,
): Promise<Rendered> {
  resize(size[0], size[1]);
  TestBed.configureTestingModule({
    imports: [Host],
    providers: [provideRouter([])],
  });
  const fixture = TestBed.createComponent(Host);
  const host = fixture.componentInstance;
  host.base.set(base);
  host.proposed.set(proposed);
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, host, root: fixture.nativeElement as HTMLElement };
}

/** Waits for the CDK's debounced size change, then renders it. */
async function settle(fixture: ComponentFixture<Host>): Promise<void> {
  await new Promise((done) => setTimeout(done, 10));
  fixture.detectChanges();
  await fixture.whenStable();
}

/** Re-renders after an input change, as a consumer's next change detection does. */
async function update(fixture: ComponentFixture<Host>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
}

// Readers of the rendered view. Class names are those of @codemirror/merge and @codemirror/view.

function isSplit(root: HTMLElement): boolean {
  return root.querySelector('.cm-mergeView') !== null;
}

/** The proposed side: the second editor of the split view, or the one editor of the unified view. */
function proposedEditor(root: HTMLElement): Element | null {
  return isSplit(root)
    ? root.querySelector('.cm-merge-b')
    : root.querySelector('.cm-editor');
}

/** The base side of the split view. The unified view has no base editor. */
function baseEditor(root: HTMLElement): Element | null {
  return root.querySelector('.cm-merge-a');
}

function texts(nodes: Iterable<Element>): string[] {
  return [...nodes].map((node) => node.textContent ?? '');
}

/** The text of the lines marked on the proposed side. */
function addedLines(root: HTMLElement): string[] {
  return texts(proposedEditor(root)?.querySelectorAll('.cm-changedLine') ?? []);
}

/** The text of the removed line elements on the base side, never a chunk's buttons. */
function removedLines(root: HTMLElement): string[] {
  if (isSplit(root)) {
    return texts(baseEditor(root)?.querySelectorAll('.cm-changedLine') ?? []);
  }
  return texts(root.querySelectorAll('.cm-deletedChunk .cm-deletedLine'));
}

/** The text of the inline changed spans on each side. */
function changedWords(root: HTMLElement): {
  base: string[];
  proposed: string[];
} {
  if (isSplit(root)) {
    return {
      base: texts(baseEditor(root)?.querySelectorAll('.cm-changedText') ?? []),
      proposed: texts(
        proposedEditor(root)?.querySelectorAll('.cm-changedText') ?? [],
      ),
    };
  }
  return {
    base: texts(root.querySelectorAll('.cm-deletedChunk .cm-deletedText')),
    proposed: texts(
      proposedEditor(root)?.querySelectorAll('.cm-changedText') ?? [],
    ),
  };
}

/** How many control-character marks (`highlightSpecialChars`) the editor shows. */
function specialMarks(editor: Element | null): number {
  return editor?.querySelectorAll('.cm-specialChar').length ?? 0;
}

function editors(root: HTMLElement): number {
  return root.querySelectorAll('.cm-editor').length;
}

function radio(root: HTMLElement, name: string): HTMLButtonElement {
  const found = [
    ...root.querySelectorAll<HTMLButtonElement>('[role="radio"]'),
  ].find((button) => button.textContent?.trim() === name);
  if (!found) throw new Error(`no ${name} radio`);
  return found;
}

/** The text of the checked option of the layout toggle, if the toggle is shown. */
function selectedOption(root: HTMLElement): string | undefined {
  return [...root.querySelectorAll<HTMLButtonElement>('[role="radio"]')]
    .find((button) => button.getAttribute('aria-checked') === 'true')
    ?.textContent?.trim();
}

function hasToggle(root: HTMLElement): boolean {
  return root.querySelector('[aria-label="Diff layout"]') !== null;
}

function expectMarkedLine(root: HTMLElement): void {
  expect(addedLines(root).length + removedLines(root).length).toBeGreaterThan(
    0,
  );
  expect(root.textContent).not.toContain('No changes');
  expect(hasToggle(root)).toBe(true);
}

// Criterion 1: insertions, deletions and changed lines.

const CHANGED = {
  base: 'The cat sat on the mat.\n',
  proposed: 'The dog sat on the mat.\n',
};

const D1: readonly Case[] = [
  {
    name: 'insertion',
    base: 'One\nTwo\n',
    proposed: 'One\nTwo\nThree\n',
    check: (root) => {
      expect(addedLines(root)).toEqual(['Three']);
      expect(removedLines(root)).toEqual([]);
    },
  },
  {
    name: 'deletion',
    base: 'Alpha\nBeta\nGamma\n',
    proposed: 'Alpha\nGamma\n',
    check: (root) => {
      expect(removedLines(root)).toEqual(['Beta']);
      expect(addedLines(root)).toEqual([]);
    },
  },
  {
    name: 'changed line',
    ...CHANGED,
    check: (root) => {
      expect(removedLines(root)).toEqual(['The cat sat on the mat.']);
      expect(addedLines(root)).toEqual(['The dog sat on the mat.']);
      expect(changedWords(root)).toEqual({ base: ['cat'], proposed: ['dog'] });
    },
  },
  {
    name: 'new file',
    base: '',
    proposed: 'Chapter one\n',
    check: (root) => {
      expect(addedLines(root)).toContain('Chapter one');
    },
  },
  {
    name: 'emptied file',
    base: 'Chapter one\n',
    proposed: '',
    check: (root) => {
      expect(removedLines(root)).toContain('Chapter one');
    },
  },
];

// Criterion 3: whitespace-only, line-ending-only and front-matter-only changes.

const D3A: readonly Case[] = [
  {
    name: 'trailing space added',
    base: 'Hello world\n',
    proposed: 'Hello world \n',
    check: expectMarkedLine,
  },
  {
    name: 'indentation added',
    base: 'item\n',
    proposed: '  item\n',
    check: expectMarkedLine,
  },
  {
    name: 'tabs to spaces',
    base: '\titem\n',
    proposed: '    item\n',
    check: expectMarkedLine,
  },
  {
    name: 'final newline added',
    base: 'Last line',
    proposed: 'Last line\n',
    check: expectMarkedLine,
  },
  {
    name: 'LF to CRLF only',
    base: 'One\nTwo\n',
    proposed: 'One\r\nTwo\r\n',
    check: (root) => {
      expectMarkedLine(root);
      // The proposed side shows the carriage return as a control mark, in both layouts.
      expect(specialMarks(proposedEditor(root))).toBeGreaterThan(0);
    },
  },
  {
    name: 'CRLF to LF only',
    base: 'One\r\nTwo\r\n',
    proposed: 'One\nTwo\n',
    check: (root) => {
      expectMarkedLine(root);
      // The base side shows the mark in the split view only (see the plan, section 4).
      if (isSplit(root)) {
        expect(specialMarks(baseEditor(root))).toBeGreaterThan(0);
      }
    },
  },
  {
    name: 'front matter value changed',
    base: '---\ntitle: One\n---\nBody\n',
    proposed: '---\ntitle: Two\n---\nBody\n',
    check: (root) => {
      expectMarkedLine(root);
      expect([...addedLines(root), ...removedLines(root)]).not.toContain(
        'Body',
      );
    },
  },
  {
    name: 'front matter added',
    base: 'Body\n',
    proposed: '---\ntitle: One\n---\nBody\n',
    check: expectMarkedLine,
  },
  {
    name: 'front matter removed',
    base: '---\ntitle: One\n---\nBody\n',
    proposed: 'Body\n',
    check: expectMarkedLine,
  },
];

// Layout by device class, and the toggle.

describe('criterion 1: insertions, deletions and changed lines', () => {
  it.each(bothLayouts(D1))('D1 %s, %s', async (_name, _layout, size, c) => {
    const { root } = await render(size, c.base, c.proposed);
    expect(root.textContent).not.toContain('No changes');
    c.check(root);
  });
});

describe('criterion 2: unified on a phone, side by side on a tablet or desktop, and the toggle', () => {
  it.each([
    ['a phone', PHONE, 'Unified'],
    ['a tablet', TABLET, 'Side by side'],
    ['a desktop', DESKTOP, 'Side by side'],
  ])(
    'D2 on %s shows the layout the device class gives, and the toggle overrides it',
    async (_label, size, expected) => {
      const { fixture, root } = await render(
        size,
        CHANGED.base,
        CHANGED.proposed,
      );
      const other = expected === 'Unified' ? 'Side by side' : 'Unified';
      expect(selectedOption(root)).toBe(expected);
      expect(isSplit(root)).toBe(expected === 'Side by side');
      expect(editors(root)).toBe(expected === 'Unified' ? 1 : 2);

      radio(root, other).click();
      await update(fixture);
      expect(selectedOption(root)).toBe(other);
      expect(isSplit(root)).toBe(other === 'Side by side');
      expect(editors(root)).toBe(other === 'Unified' ? 1 : 2);
    },
  );

  it('D2 keeps a toggled layout across a resize, and resizes change the layout only without a toggle', async () => {
    const { fixture, root } = await render(
      PHONE,
      CHANGED.base,
      CHANGED.proposed,
    );
    expect(selectedOption(root)).toBe('Unified');

    resize(1280, 800);
    await settle(fixture);
    expect(selectedOption(root)).toBe('Side by side');
    expect(editors(root)).toBe(2);

    radio(root, 'Unified').click();
    await update(fixture);
    resize(390, 844);
    await settle(fixture);
    expect(selectedOption(root)).toBe('Unified');
    expect(editors(root)).toBe(1);

    resize(1280, 800);
    await settle(fixture);
    expect(selectedOption(root)).toBe('Unified');
    expect(editors(root)).toBe(1);
  });
});

describe('criterion 3: whitespace, line endings and front matter are changes; identical text says so', () => {
  it.each(bothLayouts(D3A))('D3a %s, %s', async (_name, _layout, size, c) => {
    const { root } = await render(size, c.base, c.proposed);
    c.check(root);
  });

  it.each([
    ['LF', 'One\nTwo\n', 'One\nTwo\n'],
    ['CRLF', 'One\r\nTwo\r\n', 'One\r\nTwo\r\n'],
    ['empty', '', ''],
  ])(
    'D3b shows "No changes" for identical %s text, with no editor and no toggle',
    async (_label, base, proposed) => {
      const { root } = await render(PHONE, base, proposed);
      expect(root.textContent).toContain('No changes');
      expect(editors(root)).toBe(0);
      expect(hasToggle(root)).toBe(false);
      expect(root.textContent).toContain('notes/chapter.md');
    },
  );
});

// Extra behaviour: the banner, the label, read-only, input changes and a byte order mark.

describe('extra behaviour', () => {
  it('E1 shows the conflict banner only when conflict is set, with the default or the given message', async () => {
    const { fixture, host, root } = await render(
      DESKTOP,
      CHANGED.base,
      CHANGED.proposed,
    );
    const status = () => root.querySelector('[role="status"]');
    expect(status()).toBeNull();
    expect(editors(root)).toBe(2);

    host.conflict.set(true);
    await update(fixture);
    expect(status()?.textContent?.trim()).toBe(
      'This change conflicts with the current file.',
    );
    expect(editors(root)).toBe(2);

    host.conflictMessage.set('Saved again by someone else.');
    await update(fixture);
    expect(status()?.textContent?.trim()).toBe('Saved again by someone else.');
    expect(editors(root)).toBe(2);
  });

  it('E2 labels the view with its path and shows the path in the header, and follows the path input', async () => {
    const { fixture, host, root } = await render(
      DESKTOP,
      D1[0].base,
      D1[0].proposed,
    );
    expect(
      root.querySelector('[aria-label="Changes to notes/chapter.md"]'),
    ).not.toBeNull();
    expect(root.querySelector('header')?.textContent).toContain(
      'notes/chapter.md',
    );

    host.path.set('drafts/other.md');
    await update(fixture);
    expect(
      root.querySelector('[aria-label="Changes to drafts/other.md"]'),
    ).not.toBeNull();
    expect(root.querySelector('header')?.textContent).toContain(
      'drafts/other.md',
    );
  });

  it.each(LAYOUTS.map((l) => [l.name, l.size] as const))(
    'E3 renders no editable content and no control but the two layout options, %s',
    async (_name, size) => {
      const { root } = await render(size, CHANGED.base, CHANGED.proposed);
      const contents = root.querySelectorAll('.cm-content');
      expect(contents.length).toBeGreaterThan(0);
      for (const content of contents) {
        expect(content.getAttribute('contenteditable')).toBe('false');
      }
      const buttons = [...root.querySelectorAll('button')];
      expect(buttons.length).toBe(2);
      expect(buttons.every((b) => b.getAttribute('role') === 'radio')).toBe(
        true,
      );
    },
  );

  it.each(
    LAYOUTS.map((l) => [l.name, l.size, l.size === DESKTOP ? 2 : 1] as const),
  )('E4 re-renders when an input changes, %s', async (_name, size, count) => {
    const { fixture, host, root } = await render(size, 'One\n', 'One\nTwo\n');
    expect(addedLines(root)).toEqual(['Two']);

    host.proposed.set('One\nThree\n');
    await update(fixture);
    expect(addedLines(root)).toEqual(['Three']);
    expect(root.textContent).not.toContain('Two');
    expect(editors(root)).toBe(count);
  });

  it.each(LAYOUTS.map((l) => [l.name, l.size] as const))(
    'E5 marks a line with a byte order mark and shows the mark on the proposed side, %s',
    async (_name, size) => {
      const { root } = await render(size, 'Text\n', '\ufeffText\n');
      expect(addedLines(root).length).toBeGreaterThan(0);
      expect(specialMarks(proposedEditor(root))).toBeGreaterThan(0);
      expect(root.textContent).not.toContain('No changes');
    },
  );
});
