import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router, type Routes } from '@angular/router';
import { afterEach, describe, expect, it } from 'vitest';
import { restoreMatchMedia, stubMatchMedia } from './testing/match-media';
import { ToolCallCard } from './tool-call-card';
import type { ToolCallStatus, ToolCallView } from './tool-call-view';

@Component({ template: '' })
class Blank {}

/** A host that projects one paragraph into the card, to test the content slot. */
@Component({
  imports: [ToolCallCard],
  template: `<app-tool-call-card [call]="view"
    ><p>Extra body</p></app-tool-call-card
  >`,
})
class Host {
  readonly view: ToolCallView = {
    name: 'write_file',
    status: 'done',
    output: { kind: 'json', value: { written: 1 } },
  };
}

async function renderHost(): Promise<ComponentFixture<Host>> {
  TestBed.configureTestingModule({ providers: [provideRouter(CARD_ROUTES)] });
  const fixture = TestBed.createComponent(Host);
  await settle(fixture);
  return fixture;
}

const CARD_ROUTES: Routes = [
  { path: '', pathMatch: 'full', component: Blank },
  { path: 'projects/:projectId/chat', component: Blank },
];

const PHONE = [390, 844] as const;
const TABLET = [820, 1180] as const;
const DESKTOP = [1280, 800] as const;

const BASE: ToolCallView = {
  name: 'read_file',
  status: 'pending',
  arguments: {
    path: 'sources/outline.md',
    options: { lines: [1, 20], follow: false },
  },
  sources: ['sources/outline.md', 'notes/ideas.md'],
};

/** The element, asserted present; the test fails here when it is missing. */
function required<T extends Element>(element: T | null): T {
  expect(element).not.toBeNull();
  return element as T;
}

function root(fixture: ComponentFixture<unknown>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function article(fixture: ComponentFixture<unknown>): HTMLElement {
  return required(root(fixture).querySelector('article'));
}

function header(fixture: ComponentFixture<unknown>): HTMLElement {
  return required(root(fixture).querySelector('button[aria-expanded]'));
}

/** The region with this accessible name, or null when the card does not show it. */
function region(
  fixture: ComponentFixture<unknown>,
  name: string,
): Element | null {
  return root(fixture).querySelector(`section[aria-label="${name}"]`);
}

/** The text of each source item in the Sources region. */
function sourceTexts(fixture: ComponentFixture<unknown>): string[] {
  const items = required(region(fixture, 'Sources')).querySelectorAll('li');
  return Array.from(items).map((item) => (item.textContent ?? '').trim());
}

/**
 * The lines of a nested list: two spaces of indent per level, then each item's own text (without
 * its nested list), with the spaces collapsed.
 */
function treeLines(list: Element | null, depth = 0): string[] {
  if (list === null) return [];
  const lines: string[] = [];
  for (const item of Array.from(list.children)) {
    const nested = Array.from(item.children).filter(
      (child) => child.tagName === 'UL',
    );
    const clone = item.cloneNode(true) as Element;
    for (const child of Array.from(clone.children)) {
      if (child.tagName === 'UL') child.remove();
    }
    const own = (clone.textContent ?? '').replace(/\s+/g, ' ').trim();
    lines.push(`${'  '.repeat(depth)}${own}`);
    for (const child of nested) lines.push(...treeLines(child, depth + 1));
  }
  return lines;
}

function outputList(fixture: ComponentFixture<unknown>): Element | null {
  return required(region(fixture, 'Output')).querySelector('ul');
}

async function settle<T>(fixture: ComponentFixture<T>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
}

async function render(
  view: ToolCallView,
): Promise<ComponentFixture<ToolCallCard>> {
  TestBed.configureTestingModule({ providers: [provideRouter(CARD_ROUTES)] });
  const fixture = TestBed.createComponent(ToolCallCard);
  fixture.componentRef.setInput('call', view);
  await settle(fixture);
  return fixture;
}

async function update(
  fixture: ComponentFixture<ToolCallCard>,
  view: ToolCallView,
): Promise<void> {
  fixture.componentRef.setInput('call', view);
  await settle(fixture);
}

async function click(fixture: ComponentFixture<unknown>): Promise<void> {
  header(fixture).click();
  await settle(fixture);
}

afterEach(() => {
  restoreMatchMedia();
});

describe('tool-call card', () => {
  const cases: ReadonlyArray<{
    status: ToolCallStatus;
    word: string;
    extra: Partial<ToolCallView>;
  }> = [
    { status: 'pending', word: 'Pending', extra: {} },
    { status: 'running', word: 'Running', extra: {} },
    {
      status: 'done',
      word: 'Done',
      extra: { output: { kind: 'json', value: { lines: 20 } } },
    },
    {
      status: 'error',
      word: 'Error',
      extra: { error: 'File not found: sources/outline.md' },
    },
  ];

  it.each(cases)(
    'T1 renders the $status card with its label, name, arguments, output or error, and sources',
    async ({ status, word, extra }) => {
      stubMatchMedia(...DESKTOP);
      const fixture = await render({ ...BASE, status, ...extra });

      expect(article(fixture).getAttribute('aria-label')).toBe(
        'Tool call: read_file',
      );
      expect(header(fixture).textContent).toContain('read_file');
      expect(header(fixture).textContent).toContain(word);
      expect(
        treeLines(required(region(fixture, 'Arguments')).querySelector('ul')),
      ).toEqual([
        'path: sources/outline.md',
        'options:',
        '  lines:',
        '    0: 1',
        '    1: 20',
        '  follow: false',
      ]);
      expect(sourceTexts(fixture)).toEqual([
        'sources/outline.md',
        'notes/ideas.md',
      ]);
      if (status === 'done') {
        expect(treeLines(outputList(fixture))).toEqual(['lines: 20']);
        expect(region(fixture, 'Error')).toBeNull();
      } else if (status === 'error') {
        expect(required(region(fixture, 'Error')).textContent).toContain(
          'File not found: sources/outline.md',
        );
        expect(region(fixture, 'Output')).toBeNull();
      } else {
        expect(region(fixture, 'Output')).toBeNull();
        expect(region(fixture, 'Error')).toBeNull();
      }
    },
  );

  it('T2 shows JSON output as a tree and stops a very deep value', async () => {
    stubMatchMedia(...DESKTOP);
    const fixture = await render({
      ...BASE,
      status: 'done',
      output: { kind: 'json', value: { files: ['a.md', 'b.md'] } },
    });
    expect(treeLines(outputList(fixture))).toEqual([
      'files:',
      '  0: a.md',
      '  1: b.md',
    ]);

    let deep: unknown = 1;
    for (let level = 0; level < 10; level++) deep = { a: deep };
    await update(fixture, {
      ...BASE,
      status: 'done',
      output: { kind: 'json', value: deep },
    });

    const expected = [
      ...Array.from({ length: 8 }, (_, depth) => `${'  '.repeat(depth)}a:`),
      `${'  '.repeat(8)}a: …`,
    ];
    expect(treeLines(outputList(fixture))).toEqual(expected);
  });

  it('T3 shows Markdown output', async () => {
    stubMatchMedia(...DESKTOP);
    const fixture = await render({
      ...BASE,
      status: 'done',
      output: { kind: 'markdown', text: '**bold** text' },
    });
    const output = required(region(fixture, 'Output'));
    expect(output.textContent).toContain('**bold** text');
    expect(output.querySelector('strong')).toBeNull();
  });

  it('T4 on a phone the card is collapsed, shows a one-line summary, expands on tap and collapses again', async () => {
    stubMatchMedia(...PHONE);
    const running: ToolCallView = {
      ...BASE,
      status: 'running',
      summary: '2 files',
    };
    const fixture = await render(running);

    expect(header(fixture).getAttribute('aria-expanded')).toBe('false');
    expect(header(fixture).textContent).toContain('read_file');
    expect(header(fixture).textContent).toContain('Running');
    expect(header(fixture).textContent).toContain('2 files');
    expect(root(fixture).textContent).not.toContain('sources/outline.md');
    expect(root(fixture).textContent).not.toContain('notes/ideas.md');
    expect(region(fixture, 'Arguments')).toBeNull();
    expect(region(fixture, 'Sources')).toBeNull();

    await click(fixture);
    expect(header(fixture).getAttribute('aria-expanded')).toBe('true');
    expect(region(fixture, 'Arguments')).not.toBeNull();
    expect(region(fixture, 'Sources')).not.toBeNull();

    await update(fixture, {
      ...running,
      status: 'done',
      output: { kind: 'json', value: { lines: 20 } },
    });
    expect(header(fixture).getAttribute('aria-expanded')).toBe('true');
    expect(header(fixture).textContent).toContain('Done');
    expect(region(fixture, 'Output')).not.toBeNull();

    await click(fixture);
    expect(header(fixture).getAttribute('aria-expanded')).toBe('false');
    expect(region(fixture, 'Arguments')).toBeNull();
  });

  it.each([TABLET, DESKTOP])(
    'T5 on a tablet and on a desktop the card is expanded by default (%i by %i)',
    async (width, height) => {
      stubMatchMedia(width, height);
      const fixture = await render({
        ...BASE,
        status: 'running',
        summary: '2 files',
      });
      expect(header(fixture).getAttribute('aria-expanded')).toBe('true');
      expect(region(fixture, 'Arguments')).not.toBeNull();
      expect(region(fixture, 'Sources')).not.toBeNull();
    },
  );

  it('T6a an explicit collapsed flag wins over the desktop default', async () => {
    stubMatchMedia(...DESKTOP);
    const fixture = await render({ ...BASE, collapsed: true });
    expect(header(fixture).getAttribute('aria-expanded')).toBe('false');
  });

  it('T6b an explicit expanded flag wins over the phone default', async () => {
    stubMatchMedia(...PHONE);
    const fixture = await render({ ...BASE, collapsed: false });
    expect(header(fixture).getAttribute('aria-expanded')).toBe('true');
  });

  it('T8 sources are links under a project URL and text elsewhere', async () => {
    stubMatchMedia(...DESKTOP);
    const sources = ['sources/outline.md', 'notes/a b&c.md'];
    const fixture = await render({ ...BASE, status: 'done', sources });
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/projects/p1/chat');
    await settle(fixture);
    const anchors = Array.from(
      required(region(fixture, 'Sources')).querySelectorAll('a'),
    );
    expect(anchors).toHaveLength(2);
    expect(
      anchors.map((anchor) => {
        const url = new URL(
          anchor.getAttribute('href') ?? '',
          'http://localhost',
        );
        return [url.pathname, url.searchParams.get('path')];
      }),
    ).toEqual([
      ['/projects/p1/files', 'sources/outline.md'],
      ['/projects/p1/files', 'notes/a b&c.md'],
    ]);

    await router.navigateByUrl('/');
    await settle(fixture);
    expect(
      required(region(fixture, 'Sources')).querySelectorAll('a'),
    ).toHaveLength(0);
    expect(sourceTexts(fixture)).toEqual(sources);
  });

  describe('projected content', () => {
    it('T9a shows projected content after the Output region on a desktop', async () => {
      stubMatchMedia(...DESKTOP);
      const fixture = await renderHost();
      const paragraph = required(root(fixture).querySelector('p'));
      expect(paragraph.textContent).toBe('Extra body');
      const output = required(region(fixture, 'Output'));
      expect(
        output.compareDocumentPosition(paragraph) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).not.toBe(0);
    });

    it('T9b keeps projected content out of the DOM until a phone card is expanded', async () => {
      stubMatchMedia(...PHONE);
      const fixture = await renderHost();
      expect(header(fixture).getAttribute('aria-expanded')).toBe('false');
      expect(root(fixture).querySelector('p')).toBeNull();

      await click(fixture);
      expect(required(root(fixture).querySelector('p')).textContent).toBe(
        'Extra body',
      );
    });
  });
});
