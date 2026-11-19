import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { SseEnvelope } from '@bbartolome/scriba-contracts/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiPath } from '../../shell';
import {
  restoreMatchMedia,
  stubMatchMedia,
} from '../../shell/testing/match-media';
import {
  createShellTestDoubles,
  type ShellTestDoubles,
} from '../../shell/testing/test-doubles';
import { manuscriptRoutes } from './compile-export.routes';
import { MANUSCRIPT_PATH } from './manuscript-contract';
import { SNAPSHOT_RESTORE_PATH, SNAPSHOTS_PATH } from './snapshot-contract';

const REV1 = `sha256:${'1'.repeat(64)}`;

const VIEW = {
  entries: [],
  totals: { body: 0, manuscript: 0 },
  orderSource: 'alphabetical',
  warnings: [],
  revision: REV1,
};

const READABLE = {
  id: 'before-cut-20261119T101500Z',
  label: 'before-cut',
  createdAt: '2026-11-19T10:15:00Z',
  fileCount: 4,
  words: { body: 2800, total: 3000 },
};

const UNREADABLE = {
  id: 'broken-20261118T090000Z',
  label: 'broken',
  createdAt: '2026-11-18T09:00:00Z',
  fileCount: 2,
  words: null,
  unreadable: true,
};

const NEW = {
  id: 'draft-20261119T111000Z',
  label: 'draft',
  createdAt: '2026-11-19T11:10:00Z',
  fileCount: 4,
  words: { body: 2900, total: 3100 },
};

let doubles: ShellTestDoubles;

beforeEach(() => {
  doubles = createShellTestDoubles();
  doubles.api.respond('GET', MANUSCRIPT_PATH, VIEW);
  doubles.api.respond('GET', SNAPSHOTS_PATH, { snapshots: [] });
  vi.spyOn(window, 'confirm').mockReturnValue(false);
});

afterEach(() => {
  vi.restoreAllMocks();
  restoreMatchMedia();
});

/** Renders the manuscript route, which hosts the panel, on a viewport of `width` by `height`. */
async function renderPage(url: string, width = 1280, height = 800) {
  stubMatchMedia(width, height);
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'projects/:projectId/manuscript', children: manuscriptRoutes },
      ]),
      ...doubles.providers,
    ],
  });
  const harness = await RouterTestingHarness.create(url);
  harness.detectChanges();
  await harness.fixture.whenStable();
  harness.detectChanges();
  return harness;
}

/** Lets pending reads and the change detection they cause finish. */
async function settle(harness: RouterTestingHarness): Promise<void> {
  harness.detectChanges();
  await harness.fixture.whenStable();
  harness.detectChanges();
}

/** Pushes one compile-export or project-store event through the fake event source. */
function push(
  module: 'compile-export' | 'project-store',
  envelope: { type: string; data: unknown },
): void {
  const event: SseEnvelope = { module, ...envelope };
  doubles.events.push(event);
}

/** How many requests of one method and path reached the fake API client. */
function countOf(path: ApiPath, method: 'GET' | 'POST' = 'GET'): number {
  return doubles.api.requests.filter(
    (request) => request.method === method && request.path === path,
  ).length;
}

/** The panel's root element. */
function panelOf(root: HTMLElement): HTMLElement {
  const panel = root.querySelector('app-snapshots-panel');
  if (!(panel instanceof HTMLElement)) throw new Error('No snapshots panel.');
  return panel;
}

/** The row of one snapshot, by its id. */
function rowOf(root: HTMLElement, id: string): HTMLElement {
  const row = root.querySelector(`li[data-snapshot-id="${id}"]`);
  if (!(row instanceof HTMLElement)) throw new Error(`No row for ${id}.`);
  return row;
}

/** The button named `Restore <id>` of one row. */
function restoreButtonOf(root: HTMLElement, id: string): HTMLButtonElement {
  const button = root.querySelector(`button[aria-label="Restore ${id}"]`);
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`No restore button for ${id}.`);
  }
  return button;
}

/** The label input of the panel. */
function labelInput(root: HTMLElement): HTMLInputElement {
  const input = root.querySelector('input[aria-label="Snapshot label"]');
  if (!(input instanceof HTMLInputElement)) throw new Error('No label input.');
  return input;
}

/** The Snapshot button of the panel. */
function snapshotButton(root: HTMLElement): HTMLButtonElement {
  const button = Array.from(root.querySelectorAll('button')).find(
    (candidate) => candidate.textContent?.trim() === 'Snapshot',
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error('No Snapshot button.');
  }
  return button;
}

/** Sets the label input's value and dispatches the input event that typing dispatches. */
function type(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

describe('SnapshotsPanel', () => {
  it('S1 restore needs confirmation; the dialog names the pre-restore snapshot', async () => {
    doubles.api.respond('GET', SNAPSHOTS_PATH, { snapshots: [READABLE] });
    doubles.api.respond('POST', SNAPSHOT_RESTORE_PATH, VIEW);
    const harness = await renderPage('/projects/p1/manuscript');
    const root = harness.routeNativeElement as HTMLElement;
    await settle(harness);
    const confirm = vi.mocked(window.confirm);

    restoreButtonOf(root, READABLE.id).click();
    await settle(harness);
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(String(confirm.mock.calls[0]?.[0])).toContain('pre-restore');
    expect(countOf(SNAPSHOT_RESTORE_PATH, 'POST')).toBe(0);

    confirm.mockReturnValue(true);
    restoreButtonOf(root, READABLE.id).click();
    await settle(harness);
    expect(countOf(SNAPSHOT_RESTORE_PATH, 'POST')).toBe(1);
    expect(doubles.api.requests.at(-1)).toEqual({
      method: 'POST',
      path: SNAPSHOT_RESTORE_PATH,
      body: { id: READABLE.id },
    });
  });

  it("S2 unreadable snapshots can't be restored", async () => {
    doubles.api.respond('GET', SNAPSHOTS_PATH, {
      snapshots: [UNREADABLE, READABLE],
    });
    const harness = await renderPage('/projects/p1/manuscript');
    const root = harness.routeNativeElement as HTMLElement;
    await settle(harness);

    const unreadable = rowOf(root, UNREADABLE.id);
    expect(unreadable.textContent).toContain('Unreadable');
    expect(unreadable.querySelector('button')).toBeNull();

    expect(restoreButtonOf(root, READABLE.id).textContent?.trim()).toBe(
      'Restore',
    );
    expect(countOf(SNAPSHOT_RESTORE_PATH, 'POST')).toBe(0);
  });

  it('S3 create sends the trimmed label; snapshot-created and snapshot-restored refresh the list', async () => {
    doubles.api.respond('GET', SNAPSHOTS_PATH, { snapshots: [READABLE] });
    doubles.api.respond('POST', SNAPSHOTS_PATH, NEW);
    doubles.api.respond('POST', SNAPSHOT_RESTORE_PATH, VIEW);
    const harness = await renderPage('/projects/p1/manuscript');
    const root = harness.routeNativeElement as HTMLElement;
    await settle(harness);

    type(labelInput(root), ' before-cut ');
    await settle(harness);
    snapshotButton(root).click();
    await settle(harness);
    expect(countOf(SNAPSHOTS_PATH, 'POST')).toBe(1);
    expect(doubles.api.requests.at(-1)).toEqual({
      method: 'POST',
      path: SNAPSHOTS_PATH,
      body: { label: 'before-cut' },
    });

    doubles.api.respond('GET', SNAPSHOTS_PATH, { snapshots: [NEW, READABLE] });
    push('compile-export', {
      type: 'snapshot-created',
      data: { projectId: 'p1', snapshot: NEW },
    });
    await settle(harness);
    expect(countOf(SNAPSHOTS_PATH)).toBe(2);
    expect(
      panelOf(root)
        .querySelector('li[data-snapshot-id]')
        ?.getAttribute('data-snapshot-id'),
    ).toBe(NEW.id);

    push('compile-export', {
      type: 'snapshot-restored',
      data: { projectId: 'p1', snapshotId: READABLE.id },
    });
    await settle(harness);
    expect(countOf(SNAPSHOTS_PATH)).toBe(3);

    push('compile-export', {
      type: 'snapshot-created',
      data: { projectId: 'other', snapshot: NEW },
    });
    await settle(harness);
    expect(countOf(SNAPSHOTS_PATH)).toBe(3);
  });

  it('S4 phone is read-only: the label, the Snapshot and Restore controls are disabled and no write is sent', async () => {
    doubles.api.respond('GET', SNAPSHOTS_PATH, { snapshots: [READABLE] });
    const harness = await renderPage('/projects/p1/manuscript', 390, 844);
    const root = harness.routeNativeElement as HTMLElement;
    await settle(harness);

    type(labelInput(root), 'before-cut');
    await settle(harness);

    expect(labelInput(root).disabled).toBe(true);
    expect(snapshotButton(root).disabled).toBe(true);
    expect(restoreButtonOf(root, READABLE.id).disabled).toBe(true);
    expect(rowOf(panelOf(root), READABLE.id)).toBeDefined();

    snapshotButton(root).click();
    restoreButtonOf(root, READABLE.id).click();
    await settle(harness);
    expect(countOf(SNAPSHOTS_PATH, 'POST')).toBe(0);
    expect(countOf(SNAPSHOT_RESTORE_PATH, 'POST')).toBe(0);
  });
});
