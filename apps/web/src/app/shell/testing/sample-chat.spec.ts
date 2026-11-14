import { TestBed } from '@angular/core/testing';
import { provideRouter, type Route } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { afterEach, describe, expect, it } from 'vitest';
import { restoreMatchMedia, stubMatchMedia } from './match-media';
import { createShellTestDoubles } from './test-doubles';

// The sample route, registered by the spec the way a feature registers its own entry.
const sampleEntry: Route = {
  path: 'projects/:projectId/chat',
  loadChildren: () =>
    import('./sample-chat').then((feature) => feature.sampleChatRoutes),
};

/** The element, asserted present; the test fails here when it is missing. */
function required<T extends Element>(element: T | null | undefined): T {
  expect(element).toBeTruthy();
  return element as T;
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

afterEach(() => {
  restoreMatchMedia();
});

describe('sample chat route', () => {
  it('T7 renders a run tool calls from fake events, binding only the call input', async () => {
    stubMatchMedia(1280, 800);
    const doubles = createShellTestDoubles();
    TestBed.configureTestingModule({
      providers: [provideRouter([sampleEntry]), ...doubles.providers],
    });
    const harness = await RouterTestingHarness.create('/projects/p1/chat');
    const page = required(harness.routeNativeElement);
    const cards = (): HTMLElement[] =>
      Array.from(page.querySelectorAll<HTMLElement>('article'));
    const region = (card: HTMLElement, name: string): Element | null =>
      card.querySelector(`section[aria-label="${name}"]`);
    const header = (card: HTMLElement): string =>
      required(card.querySelector('button[aria-expanded]')).textContent ?? '';

    let seq = 0;
    const push = async (
      type: string,
      fields: Readonly<Record<string, unknown>>,
    ): Promise<void> => {
      seq += 1;
      doubles.events.push({
        module: 'agent-loop',
        type,
        data: { runId: 'r1', seq, ...fields },
      });
      harness.detectChanges();
      await harness.fixture.whenStable();
    };

    // (1) started: one card, pending.
    await push('tool-call-started', {
      callId: 'c1',
      name: 'list_files',
      family: 'project',
    });
    expect(cards()).toHaveLength(1);
    expect(header(required(cards()[0]))).toContain('Pending');

    // (2) args: running, with the arguments row.
    await push('tool-call-args', {
      callId: 'c1',
      arguments: { path: 'sources' },
      valid: true,
    });
    const first = required(cards()[0]);
    expect(header(first)).toContain('Running');
    expect(
      treeLines(required(region(first, 'Arguments')).querySelector('ul')),
    ).toEqual(['path: sources']);

    // (3) result: done, with the summary, the JSON rows and no Sources region.
    await push('tool-call-result', {
      callId: 'c1',
      summary: '3 files',
      output: { files: ['a.md', 'b.md', 'c.md'] },
    });
    expect(header(first)).toContain('Done');
    expect(header(first)).toContain('3 files');
    expect(
      treeLines(required(region(first, 'Output')).querySelector('ul')),
    ).toEqual(['files:', '  0: a.md', '  1: b.md', '  2: c.md']);
    expect(region(first, 'Sources')).toBeNull();

    // (4) a second call that fails on its second attempt, after the first card.
    await push('tool-call-started', {
      callId: 'c2',
      name: 'read_file',
      family: 'project',
    });
    await push('tool-call-args', {
      callId: 'c2',
      arguments: { path: 'missing.md' },
      valid: true,
    });
    await push('tool-call-error', {
      callId: 'c2',
      message: 'File not found',
      attempt: 2,
    });
    expect(cards()).toHaveLength(2);
    const second = required(cards()[1]);
    expect(header(second)).toContain('Error');
    expect(required(region(second, 'Error')).textContent).toContain(
      'Attempt 2: File not found',
    );
    expect(header(required(cards()[0]))).toContain('Done');

    // (5) a third call with sourcesUsed and no arguments: done, linked source, no Arguments region.
    await push('tool-call-started', {
      callId: 'c3',
      name: 'search_notes',
      family: 'project',
    });
    await push('tool-call-result', {
      callId: 'c3',
      summary: '1 passage',
      output: { passages: 1 },
      sourcesUsed: ['outline'],
    });
    expect(cards()).toHaveLength(3);
    const third = required(cards()[2]);
    expect(header(third)).toContain('Done');
    expect(region(third, 'Arguments')).toBeNull();
    const link = required(
      required(region(third, 'Sources')).querySelector('a'),
    );
    const url = new URL(link.getAttribute('href') ?? '', 'http://localhost');
    expect(url.pathname).toBe('/projects/p1/files');
    expect(url.searchParams.get('path')).toBe('sources/outline.md');

    expect(doubles.api.requests).toEqual([]);
  });
});
