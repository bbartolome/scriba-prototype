import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EditorView } from '@codemirror/view';
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
      [editable]="editable()"
      (contentChange)="edited.set($event)"
    />
  `,
})
class Host {
  readonly path = signal('notes/chapter.md');
  readonly base = signal('');
  readonly proposed = signal('');
  readonly editable = signal(false);
  readonly edited = signal<string | null>(null);
}

type Size = readonly [number, number];

const PHONE: Size = [390, 844];
const DESKTOP: Size = [1280, 800];

/** The two layouts the criteria use. A phone gives unified; a desktop gives side by side. */
const LAYOUTS = [
  { name: 'unified', size: PHONE },
  { name: 'side by side', size: DESKTOP },
] as const;

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
  editable: boolean,
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
  host.editable.set(editable);
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, host, root: fixture.nativeElement as HTMLElement };
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

/**
 * Types an insertion into the proposed editor. The edit goes through the
 * editor's own view and `dispatch`, the seam of plan D11.
 */
function insertInProposed(
  root: HTMLElement,
  at: number | 'end of line 1',
  insert: string,
): void {
  const dom = root.querySelector<HTMLElement>(
    '.cm-editor[data-side="proposed"]',
  );
  const view = dom ? EditorView.findFromDOM(dom) : null;
  if (!view) throw new Error('no proposed editor view');
  const from = at === 'end of line 1' ? view.state.doc.line(1).to : at;
  view.dispatch({ changes: { from, insert } });
}

describe.each(LAYOUTS)('editable merge view, $name', (layout) => {
  // Criterion 1: the proposed side accepts edits and the component emits the edited text.

  it('C1 an insertion inside a line is emitted and every other byte is kept (CRLF proposed)', async () => {
    const { fixture, host, root } = await render(
      layout.size,
      'base\n',
      'alpha\r\nbeta\r\n',
      true,
    );
    insertInProposed(root, 3, 'X');
    await update(fixture);
    expect(host.edited()).toBe('alpXha\r\nbeta\r\n');
  });

  it('C1 an insertion inside a line is emitted and every other byte is kept (LF proposed)', async () => {
    const { fixture, host, root } = await render(
      layout.size,
      'base\n',
      'alpha\nbeta\n',
      true,
    );
    insertInProposed(root, 3, 'X');
    await update(fixture);
    expect(host.edited()).toBe('alpXha\nbeta\n');
  });

  it('C2 an insertion at the end of a CRLF line keeps its line break', async () => {
    const { fixture, host, root } = await render(
      layout.size,
      'base\n',
      'alpha\r\nbeta\r\n',
      true,
    );
    insertInProposed(root, 'end of line 1', 'X');
    await update(fixture);
    expect(host.edited()).toBe('alphaX\r\nbeta\r\n');
  });

  it('C3 each edit emits the whole edited text, and the proposed side carries its label', async () => {
    const { fixture, host, root } = await render(
      layout.size,
      'base\n',
      'alpha\r\nbeta\r\n',
      true,
    );
    expect(host.edited()).toBeNull();
    insertInProposed(root, 3, 'X');
    await update(fixture);
    insertInProposed(root, 0, 'Y');
    await update(fixture);
    expect(host.edited()).toBe('YalpXha\r\nbeta\r\n');
    const content = root.querySelector(
      '.cm-editor[data-side="proposed"] .cm-content',
    );
    expect(content?.getAttribute('aria-label')).toBe(
      'Proposed text for notes/chapter.md',
    );
  });

  // Criterion 2: without `editable`, the component is the SHL-12 read-only diff.

  it('C4 without editable, both sides stay read-only, carry no label and emit nothing', async () => {
    const { fixture, host, root } = await render(
      layout.size,
      'base\n',
      'alpha\r\nbeta\r\n',
      false,
    );
    const sides = root.querySelectorAll('.cm-editor[data-side]');
    expect(sides.length).toBeGreaterThan(0);
    for (const side of sides) {
      const content = side.querySelector('.cm-content');
      expect(content?.getAttribute('contenteditable')).toBe('false');
    }
    const proposed = root.querySelector(
      '.cm-editor[data-side="proposed"] .cm-content',
    );
    expect(proposed?.hasAttribute('aria-label')).toBe(false);
    insertInProposed(root, 3, 'X');
    await update(fixture);
    expect(host.edited()).toBeNull();
  });

  // Identical text: with `editable` the proposed side still opens for edits.

  it('E1 with editable, identical text still opens the proposed side for edits', async () => {
    const { fixture, host, root } = await render(
      layout.size,
      'alpha\r\n',
      'alpha\r\n',
      true,
    );
    expect(root.textContent).not.toContain('No changes');
    expect(
      root.querySelector('.cm-editor[data-side="proposed"]'),
    ).not.toBeNull();
    insertInProposed(root, 0, 'X');
    await update(fixture);
    expect(host.edited()).toBe('Xalpha\r\n');
  });

  // Criterion 3: an LF to CRLF change alone shows a visible mark in editable mode.
  // This is the completion gate of plan D9 (third fixture).

  it('C6 with editable, an LF to CRLF only change is marked', async () => {
    const { fixture, host, root } = await render(
      layout.size,
      'alpha\nbeta\n',
      'alpha\r\nbeta\r\n',
      true,
    );
    await update(fixture);
    expect(root.textContent).not.toContain('No changes');
    expect(addedLines(root).length).toBeGreaterThan(0);
    expect(removedLines(root).length).toBeGreaterThan(0);
    expect(host.edited()).toBeNull();
  });
});
