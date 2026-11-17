import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { EditorView } from '@codemirror/view';
import type {
  PendingChange,
  PendingConflict,
} from '@bbartolome/scriba-contracts/project-store';
import type { SseEnvelope } from '@bbartolome/scriba-contracts/platform';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ApiError, type ApiPath } from '../../shell';
import {
  restoreMatchMedia,
  stubMatchMedia,
} from '../../shell/testing/match-media';
import {
  createShellTestDoubles,
  type ShellTestDoubles,
} from '../../shell/testing/test-doubles';
import { UnsavedTextRegistry } from '../../shell/unsaved-text';
import { reviewRoutes } from './project-store.routes';

const LIST: ApiPath = '/api/project-store/projects/p1/pending';
const HASH = `sha256:${'a'.repeat(64)}`;
const CREATED = '2026-11-14T09:00:00Z';

/** A pending id of the form 1b: a UTC timestamp, then six hex digits. */
function idOf(n: number): string {
  return `20261114T${'0'.repeat(8)}${n}Z-${'0'.repeat(5)}${n}`;
}

function actionPath(n: number, action: string): ApiPath {
  return `${LIST}/${idOf(n)}/${action}` as ApiPath;
}

/** A change of drafts/c<n>.md, proposed by agent run r1 unless `extra` says otherwise. */
function change(n: number, extra: Partial<PendingChange> = {}): PendingChange {
  return {
    id: idOf(n),
    projectId: 'p1',
    targetPath: `drafts/c${n}.md`,
    kind: 'modify',
    diff: '',
    capturedBase: { hash: HASH, content: 'Old' },
    proposed: 'New',
    origin: { kind: 'agent-run', runId: 'r1' },
    status: 'pending',
    conflict: null,
    createdAt: CREATED,
    updatedAt: CREATED,
    ...extra,
  };
}

const BASE_CONFLICT: PendingConflict = {
  reason: 'base-changed',
  detectedAt: CREATED,
};

beforeEach(() => {
  stubMatchMedia(1280, 800);
});

afterEach(() => {
  restoreMatchMedia();
});

function render(
  doubles: ShellTestDoubles,
  url: string,
): Promise<RouterTestingHarness> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'projects/:projectId/review', children: reviewRoutes },
      ]),
      ...doubles.providers,
    ],
  });
  return RouterTestingHarness.create(url).then(async (harness) => {
    await settle(harness);
    return harness;
  });
}

async function settle(harness: RouterTestingHarness): Promise<void> {
  harness.detectChanges();
  await harness.fixture.whenStable();
  harness.detectChanges();
}

function root(harness: RouterTestingHarness): HTMLElement {
  const element = harness.routeNativeElement;
  expect(element).toBeDefined();
  return element as HTMLElement;
}

/** The list item of the change whose target path is `path`. */
function rowOf(harness: RouterTestingHarness, path: string): HTMLElement {
  const row = Array.from(root(harness).querySelectorAll('li')).find(
    (item) => item.querySelector('code')?.textContent === path,
  );
  if (!row) throw new Error(`no row for ${path}`);
  return row;
}

function rowCount(harness: RouterTestingHarness): number {
  return root(harness).querySelectorAll('li').length;
}

/** The button of an element whose text is exactly `name`. */
function buttonIn(
  element: ParentNode,
  name: string,
): HTMLButtonElement | undefined {
  return Array.from(element.querySelectorAll('button')).find(
    (button) => button.textContent?.trim() === name,
  );
}

async function click(
  harness: RouterTestingHarness,
  element: HTMLElement | undefined,
): Promise<void> {
  if (!element) throw new Error('no element to click');
  element.click();
  await settle(harness);
}

/** Opens a change's panel, as the author does with its Open button. */
async function open(
  harness: RouterTestingHarness,
  path: string,
): Promise<HTMLElement> {
  const row = rowOf(harness, path);
  await click(harness, buttonIn(row, 'Open'));
  return rowOf(harness, path);
}

function requestsTo(doubles: ShellTestDoubles, path: ApiPath) {
  return doubles.api.requests.filter((request) => request.path === path);
}

function push(
  doubles: ShellTestDoubles,
  type: string,
  data: unknown,
  module: 'project-store' = 'project-store',
): void {
  const event: SseEnvelope = { module, type, data } as SseEnvelope;
  doubles.events.push(event);
}

function pushPending(
  doubles: ShellTestDoubles,
  type: 'pending-created' | 'pending-updated' | 'pending-resolved',
  pendingChange: PendingChange,
  projectId = 'p1',
): void {
  push(doubles, type, { projectId, pendingChange });
}

/** The text of the proposed editor's document: the side the author edits. */
function proposedText(harness: RouterTestingHarness): string {
  const dom =
    root(harness).querySelector<HTMLElement>(
      '.cm-editor[data-side="proposed"]',
    ) ?? root(harness).querySelector<HTMLElement>('.cm-editor');
  const view = dom ? EditorView.findFromDOM(dom) : null;
  if (!view) throw new Error('no editor view');
  return view.state.doc.toString();
}

/** Types an insertion at the start of the proposed editor, through the editor's own dispatch. */
function editProposed(harness: RouterTestingHarness, insert: string): void {
  const dom = root(harness).querySelector<HTMLElement>(
    '.cm-editor[data-side="proposed"]',
  );
  const view = dom ? EditorView.findFromDOM(dom) : null;
  if (!view) throw new Error('no proposed editor view');
  view.dispatch({ changes: { from: 0, insert } });
}

describe('ReviewPage', () => {
  it('R1 changes are grouped by origin: an agent run, or a recipe run and its output node', async () => {
    const doubles = createShellTestDoubles();
    doubles.api.respond('GET', LIST, {
      changes: [
        change(1, { origin: { kind: 'agent-run', runId: 'r1' } }),
        change(2, { origin: { kind: 'agent-run', runId: 'r1' } }),
        change(3, {
          origin: {
            kind: 'recipe-run',
            runId: 'r2',
            graphId: 'g',
            nodeId: 'n1',
          },
        }),
        change(4, {
          origin: {
            kind: 'recipe-run',
            runId: 'r2',
            graphId: 'g',
            nodeId: 'n2',
          },
        }),
      ],
    });

    const harness = await render(doubles, '/projects/p1/review');

    const headings = Array.from(root(harness).querySelectorAll('h3')).map(
      (heading) => heading.textContent?.trim(),
    );
    expect(headings).toEqual([
      'Agent run r1',
      'Recipe run r2, output n1',
      'Recipe run r2, output n2',
    ]);
    const groups = Array.from(root(harness).querySelectorAll('section')).map(
      (section) =>
        Array.from(section.querySelectorAll('code')).map((code) =>
          code.textContent?.trim(),
        ),
    );
    expect(groups).toEqual([
      ['drafts/c1.md', 'drafts/c2.md'],
      ['drafts/c3.md'],
      ['drafts/c4.md'],
    ]);
  });

  it('R2 ?run= limits the list to one run, and a live change of another run adds no row', async () => {
    const doubles = createShellTestDoubles();
    doubles.api.respond('GET', LIST, { changes: [change(1)] });

    const harness = await render(doubles, '/projects/p1/review?run=r1');

    expect(requestsTo(doubles, LIST)).toEqual([
      { method: 'GET', path: LIST, params: { run: 'r1' } },
    ]);
    expect(rowCount(harness)).toBe(1);

    pushPending(
      doubles,
      'pending-created',
      change(2, { origin: { kind: 'agent-run', runId: 'r2' } }),
    );
    await settle(harness);
    expect(rowCount(harness)).toBe(1);
  });

  it('R2 without ?run= the list GET carries no params', async () => {
    const doubles = createShellTestDoubles();
    doubles.api.respond('GET', LIST, { changes: [] });

    await render(doubles, '/projects/p1/review');

    expect(requestsTo(doubles, LIST)).toEqual([{ method: 'GET', path: LIST }]);
  });

  it('R3 live events insert, update and remove rows, and ignore another project', async () => {
    const doubles = createShellTestDoubles();
    doubles.api.respond('GET', LIST, {
      changes: [
        change(1, {
          grounding: {
            supported: 0,
            weak: 0,
            unsupported: 0,
            checkedAt: CREATED,
          },
        }),
      ],
    });
    const harness = await render(doubles, '/projects/p1/review');
    expect(rowCount(harness)).toBe(1);

    pushPending(doubles, 'pending-created', change(2));
    await settle(harness);
    expect(rowCount(harness)).toBe(2);

    pushPending(
      doubles,
      'pending-updated',
      change(1, {
        grounding: {
          supported: 0,
          weak: 0,
          unsupported: 1,
          checkedAt: CREATED,
        },
      }),
    );
    await settle(harness);
    expect(rowCount(harness)).toBe(2);
    expect(rowOf(harness, 'drafts/c1.md').textContent).toContain(
      '0 supported · 0 weak · 1 unsupported',
    );

    pushPending(doubles, 'pending-resolved', change(1, { status: 'accepted' }));
    await settle(harness);
    expect(rowCount(harness)).toBe(1);

    pushPending(doubles, 'pending-created', change(3), 'p2' as string);
    await settle(harness);
    expect(rowCount(harness)).toBe(1);
  });

  it('R4 a conflict shows its badge, and its message when the change is open', async () => {
    const doubles = createShellTestDoubles();
    doubles.api.respond('GET', LIST, {
      changes: [change(1, { conflict: BASE_CONFLICT }), change(2)],
    });
    const harness = await render(doubles, '/projects/p1/review');

    expect(rowOf(harness, 'drafts/c1.md').textContent).toContain('Conflict');
    expect(rowOf(harness, 'drafts/c2.md').textContent).not.toContain(
      'Conflict',
    );

    const opened = await open(harness, 'drafts/c1.md');
    expect(opened.textContent).toContain(
      'The file changed after this change was proposed.',
    );

    pushPending(
      doubles,
      'pending-updated',
      change(2, { conflict: BASE_CONFLICT }),
    );
    await settle(harness);
    expect(rowOf(harness, 'drafts/c2.md').textContent).toContain('Conflict');
  });

  it('R5 refresh sends no body, and each answer sets the conflict as it says', async () => {
    const doubles = createShellTestDoubles();
    doubles.api.respond('GET', LIST, {
      changes: [change(1, { conflict: BASE_CONFLICT })],
    });
    const harness = await render(doubles, '/projects/p1/review');
    const panel = await open(harness, 'drafts/c1.md');

    doubles.api.respond(
      'POST',
      actionPath(1, 'refresh'),
      change(1, { conflict: BASE_CONFLICT }),
    );
    await click(harness, buttonIn(panel, 'Refresh'));
    const first = requestsTo(doubles, actionPath(1, 'refresh'));
    expect(first).toHaveLength(1);
    expect(first[0]?.body).toBeUndefined();
    expect(rowOf(harness, 'drafts/c1.md').textContent).toContain('Conflict');

    doubles.api.respond('POST', actionPath(1, 'refresh'), change(1));
    await click(harness, buttonIn(rowOf(harness, 'drafts/c1.md'), 'Refresh'));
    expect(requestsTo(doubles, actionPath(1, 'refresh'))).toHaveLength(2);
    expect(rowOf(harness, 'drafts/c1.md').textContent).not.toContain(
      'Conflict',
    );
  });

  it('R6 accept anyway asks first: Cancel sends nothing, Confirm sends the request', async () => {
    const doubles = createShellTestDoubles();
    doubles.api.respond('GET', LIST, {
      changes: [change(1, { conflict: BASE_CONFLICT })],
    });
    const harness = await render(doubles, '/projects/p1/review');
    await open(harness, 'drafts/c1.md');

    await click(
      harness,
      buttonIn(rowOf(harness, 'drafts/c1.md'), 'Accept anyway'),
    );
    expect(root(harness).querySelector('[role="alertdialog"]')).not.toBeNull();
    expect(requestsTo(doubles, actionPath(1, 'accept-anyway'))).toHaveLength(0);

    await click(harness, buttonIn(root(harness), 'Cancel'));
    expect(root(harness).querySelector('[role="alertdialog"]')).toBeNull();
    expect(requestsTo(doubles, actionPath(1, 'accept-anyway'))).toHaveLength(0);

    await click(
      harness,
      buttonIn(rowOf(harness, 'drafts/c1.md'), 'Accept anyway'),
    );
    doubles.api.respond(
      'POST',
      actionPath(1, 'accept-anyway'),
      change(1, { status: 'accepted' }),
    );
    await click(harness, buttonIn(root(harness), 'Confirm accept anyway'));

    const sent = requestsTo(doubles, actionPath(1, 'accept-anyway'));
    expect(sent).toEqual([
      { method: 'POST', path: actionPath(1, 'accept-anyway'), body: {} },
    ]);
    expect(rowCount(harness)).toBe(0);
  });

  it('R7 an edited proposal is sent as content; an unedited one sends no content', async () => {
    const doubles = createShellTestDoubles();
    doubles.api.respond('GET', LIST, { changes: [change(1), change(2)] });
    const harness = await render(doubles, '/projects/p1/review');

    await open(harness, 'drafts/c1.md');
    editProposed(harness, 'X');
    await settle(harness);
    doubles.api.respond(
      'POST',
      actionPath(1, 'accept'),
      change(1, { status: 'accepted' }),
    );
    await click(harness, buttonIn(rowOf(harness, 'drafts/c1.md'), 'Accept'));
    expect(requestsTo(doubles, actionPath(1, 'accept'))[0]?.body).toEqual({
      content: 'XNew',
    });

    await open(harness, 'drafts/c2.md');
    doubles.api.respond(
      'POST',
      actionPath(2, 'accept'),
      change(2, { status: 'accepted' }),
    );
    await click(harness, buttonIn(rowOf(harness, 'drafts/c2.md'), 'Accept'));
    const body = requestsTo(doubles, actionPath(2, 'accept'))[0]?.body;
    expect(body).toEqual({});
    expect(Object.keys(body as object)).not.toContain('content');
  });

  it('R8 reject sends no body and removes the row; accept of an unedited change removes its row', async () => {
    const doubles = createShellTestDoubles();
    doubles.api.respond('GET', LIST, { changes: [change(1), change(2)] });
    const harness = await render(doubles, '/projects/p1/review');

    await open(harness, 'drafts/c1.md');
    doubles.api.respond(
      'POST',
      actionPath(1, 'reject'),
      change(1, { status: 'rejected' }),
    );
    await click(harness, buttonIn(rowOf(harness, 'drafts/c1.md'), 'Reject'));
    const rejects = requestsTo(doubles, actionPath(1, 'reject'));
    expect(rejects).toHaveLength(1);
    expect(rejects[0]?.body).toBeUndefined();
    expect(rowCount(harness)).toBe(1);

    await open(harness, 'drafts/c2.md');
    doubles.api.respond(
      'POST',
      actionPath(2, 'accept'),
      change(2, { status: 'accepted' }),
    );
    await click(harness, buttonIn(rowOf(harness, 'drafts/c2.md'), 'Accept'));
    expect(requestsTo(doubles, actionPath(2, 'accept'))[0]?.body).toEqual({});
    expect(rowCount(harness)).toBe(0);
  });

  it('R9 a reconcile tick re-reads the list; a failed read shows an alert and no row', async () => {
    const doubles = createShellTestDoubles();
    doubles.api.respond('GET', LIST, { changes: [change(1)] });
    const harness = await render(doubles, '/projects/p1/review');
    expect(requestsTo(doubles, LIST)).toHaveLength(1);

    doubles.events.tick('reopen');
    await settle(harness);
    expect(requestsTo(doubles, LIST)).toHaveLength(2);

    doubles.api.fail('GET', LIST, new ApiError(500, 'X', 'Boom'));
    doubles.events.tick('reopen');
    await settle(harness);
    const alert = root(harness).querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('Could not load the open changes.');
    expect(alert?.textContent).toContain('Boom');
    expect(rowCount(harness)).toBe(0);
  });

  it('R10a an edit is kept through a layout change, is sent on accept, and clears the unsaved registry', async () => {
    const doubles = createShellTestDoubles();
    doubles.api.respond('GET', LIST, { changes: [change(1)] });
    const harness = await render(doubles, '/projects/p1/review');
    const registry = TestBed.inject(UnsavedTextRegistry);

    await open(harness, 'drafts/c1.md');
    editProposed(harness, 'X');
    await settle(harness);
    expect(registry.unsaved()).toHaveLength(1);

    const unified = Array.from(
      root(harness).querySelectorAll<HTMLElement>(
        '[aria-label="Diff layout"] [role="radio"]',
      ),
    ).find((radio) => radio.textContent?.trim() === 'Unified');
    await click(harness, unified);
    expect(proposedText(harness)).toBe('XNew');

    doubles.api.respond(
      'POST',
      actionPath(1, 'accept'),
      change(1, { status: 'accepted' }),
    );
    await click(harness, buttonIn(rowOf(harness, 'drafts/c1.md'), 'Accept'));
    expect(requestsTo(doubles, actionPath(1, 'accept'))[0]?.body).toEqual({
      content: 'XNew',
    });
    expect(registry.unsaved()).toHaveLength(0);
  });

  it('R10b a changed proposal drops the edit, says so, and sends no content', async () => {
    const doubles = createShellTestDoubles();
    doubles.api.respond('GET', LIST, { changes: [change(1)] });
    const harness = await render(doubles, '/projects/p1/review');

    await open(harness, 'drafts/c1.md');
    editProposed(harness, 'X');
    await settle(harness);

    pushPending(doubles, 'pending-updated', change(1, { proposed: 'Newer' }));
    await settle(harness);
    expect(rowOf(harness, 'drafts/c1.md').textContent).toContain(
      'The proposal changed, so your edit was discarded.',
    );
    expect(proposedText(harness)).toBe('Newer');

    doubles.api.respond(
      'POST',
      actionPath(1, 'accept'),
      change(1, { status: 'accepted' }),
    );
    await click(harness, buttonIn(rowOf(harness, 'drafts/c1.md'), 'Accept'));
    expect(requestsTo(doubles, actionPath(1, 'accept'))[0]?.body).toEqual({});
  });

  it('R10c an update that changes only the grounding keeps the edit', async () => {
    const doubles = createShellTestDoubles();
    doubles.api.respond('GET', LIST, { changes: [change(1)] });
    const harness = await render(doubles, '/projects/p1/review');

    await open(harness, 'drafts/c1.md');
    editProposed(harness, 'X');
    await settle(harness);

    pushPending(
      doubles,
      'pending-updated',
      change(1, {
        grounding: {
          supported: 1,
          weak: 0,
          unsupported: 0,
          checkedAt: CREATED,
        },
      }),
    );
    await settle(harness);
    expect(rowOf(harness, 'drafts/c1.md').textContent).not.toContain(
      'The proposal changed',
    );

    doubles.api.respond(
      'POST',
      actionPath(1, 'accept'),
      change(1, { status: 'accepted' }),
    );
    await click(harness, buttonIn(rowOf(harness, 'drafts/c1.md'), 'Accept'));
    expect(requestsTo(doubles, actionPath(1, 'accept'))[0]?.body).toEqual({
      content: 'XNew',
    });
  });

  it('R11 the grounding summary and the provenance lists show their known values only', async () => {
    const doubles = createShellTestDoubles();
    doubles.api.respond('GET', LIST, {
      changes: [
        change(1, {
          grounding: {
            supported: 2,
            weak: 1,
            unsupported: 1,
            checkedAt: CREATED,
          },
          provenance: { entityIds: ['e1'], sourcesUsed: ['sources/a.md', 7] },
        }),
        change(2),
      ],
    });
    const harness = await render(doubles, '/projects/p1/review');

    const first = rowOf(harness, 'drafts/c1.md');
    expect(first.textContent).toContain('2 supported · 1 weak · 1 unsupported');
    expect(first.textContent).toContain('Unsupported claims');
    expect(first.textContent).toContain('Entities: e1');
    expect(first.textContent).toContain('Sources: sources/a.md');
    expect(first.textContent).not.toContain('7');

    const second = rowOf(harness, 'drafts/c2.md');
    expect(second.textContent).not.toContain('supported');
    expect(second.textContent).not.toContain('Entities');
    expect(second.textContent).not.toContain('Sources');
  });
});
