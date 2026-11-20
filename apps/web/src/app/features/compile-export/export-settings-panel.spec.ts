import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { SseEnvelope } from '@bbartolome/scriba-contracts/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiPath } from '../../shell';
import {
  restoreMatchMedia,
  stubMatchMedia,
} from '../../shell/testing/match-media';
import {
  createShellTestDoubles,
  type ShellTestDoubles,
} from '../../shell/testing/test-doubles';
import { manuscriptRoutes } from './compile-export.routes';
import {
  EXPORT_COPY_DEFAULT_PATH,
  EXPORT_SETTINGS_PATH,
} from './export-contract';
import { MANUSCRIPT_PATH } from './manuscript-contract';
import { SNAPSHOTS_PATH } from './snapshot-contract';

const WAIT = { timeout: 5000 };
const REV_S1 = `sha256:${'5'.repeat(64)}`;
const REV_S2 = `sha256:${'6'.repeat(64)}`;
const REV_S3 = `sha256:${'7'.repeat(64)}`;
const REV_M1 = `sha256:${'1'.repeat(64)}`;
const RAN_AT = '2026-11-19T10:15:00Z';

/** The stored settings, as the first read answers them. */
const SETTINGS_1 = {
  revision: REV_S1,
  settings: { author: 'A. Author', bibliography: 'all', lang: 'en' },
};

/** After a write of the subtitle. */
const SETTINGS_2 = {
  revision: REV_S2,
  settings: {
    author: 'A. Author',
    bibliography: 'all',
    lang: 'en',
    subtitle: 'A Subtitle',
  },
};

/** After a write of the rights. */
const SETTINGS_3 = {
  revision: REV_S3,
  settings: {
    author: 'A. Author',
    bibliography: 'all',
    lang: 'en',
    subtitle: 'A Subtitle',
    rights: 'CC BY',
  },
};

const MANUSCRIPT_VIEW = {
  entries: [
    {
      path: 'drafts/ch01.md',
      part: 'body',
      status: 'draft',
      words: 900,
      graphOrdered: false,
      inOrderField: true,
    },
  ],
  totals: { body: 900, manuscript: 900 },
  orderSource: 'alphabetical',
  warnings: [],
  revision: REV_M1,
};

const CONFLICT_TEXT =
  'The export settings changed since they were read. Reload them and try again.';

let doubles: ShellTestDoubles;

beforeEach(() => {
  doubles = createShellTestDoubles();
  doubles.api.respond('GET', MANUSCRIPT_PATH, MANUSCRIPT_VIEW);
  doubles.api.respond('GET', SNAPSHOTS_PATH, { snapshots: [] });
  doubles.api.respond('GET', EXPORT_SETTINGS_PATH, SETTINGS_1);
});

afterEach(() => {
  vi.restoreAllMocks();
  restoreMatchMedia();
});

/** Renders the page through its own route entry, with no active-project guard. */
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

/** Runs `check` after each change detection, until it passes or the wait ends. */
async function until(
  harness: RouterTestingHarness,
  check: () => void,
): Promise<void> {
  await vi.waitFor(() => {
    harness.detectChanges();
    check();
  }, WAIT);
}

/** Pushes one event through the fake event source. */
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

/** The bodies of the POST requests to one path, in order. */
function bodiesOf(path: ApiPath): unknown[] {
  return doubles.api.requests
    .filter((request) => request.method === 'POST' && request.path === path)
    .map((request) => request.body);
}

/** The settings panel element of the rendered route. */
function panelOf(harness: RouterTestingHarness): HTMLElement {
  const panel = (harness.routeNativeElement as HTMLElement).querySelector(
    'app-export-settings-panel',
  );
  if (!(panel instanceof HTMLElement)) throw new Error('No settings panel.');
  return panel;
}

/** A field of the panel, by its aria-label. */
function fieldOf(
  harness: RouterTestingHarness,
  label: string,
): HTMLInputElement | HTMLSelectElement {
  const field = panelOf(harness).querySelector(`[aria-label="${label}"]`);
  if (
    !(field instanceof HTMLInputElement) &&
    !(field instanceof HTMLSelectElement)
  ) {
    throw new Error(`No field "${label}".`);
  }
  return field;
}

/** Types a value into a text field, as the author's input does. */
function typeIn(
  harness: RouterTestingHarness,
  label: string,
  value: string,
): void {
  const field = fieldOf(harness, label);
  field.value = value;
  field.dispatchEvent(new Event('input'));
  harness.detectChanges();
}

/** The button of the panel with this text. */
function buttonNamed(
  harness: RouterTestingHarness,
  text: string,
): HTMLButtonElement {
  const button = [...panelOf(harness).querySelectorAll('button')].find(
    (item) => item.textContent?.trim() === text,
  );
  if (!button) throw new Error(`No button "${text}".`);
  return button;
}

/** The copy-default button of one template row. */
function copyButtonOf(
  harness: RouterTestingHarness,
  format: string,
): HTMLButtonElement {
  const button = panelOf(harness).querySelector<HTMLButtonElement>(
    `[data-format="${format}"] button`,
  );
  if (!button) throw new Error(`No copy button for ${format}.`);
  return button;
}

describe('ExportSettingsPanel', () => {
  it('G1 The settings panel sends only changed fields with the current revision; copy-default posts the chosen path.', async () => {
    doubles.api.respond('POST', EXPORT_SETTINGS_PATH, SETTINGS_2);
    doubles.api.respond('POST', EXPORT_COPY_DEFAULT_PATH, {
      path: 'custom-reference.docx',
      hash: REV_S1,
      mtime: RAN_AT,
    });
    const harness = await renderPage('/projects/p1/manuscript');
    await until(harness, () => {
      fieldOf(harness, 'Subtitle');
    });

    typeIn(harness, 'Subtitle', 'A Subtitle');
    buttonNamed(harness, 'Save').click();
    await settle(harness);

    expect(bodiesOf(EXPORT_SETTINGS_PATH)).toEqual([
      { revision: REV_S1, settings: { subtitle: 'A Subtitle' } },
    ]);

    typeIn(harness, 'Rights', 'CC BY');
    doubles.api.respond('POST', EXPORT_SETTINGS_PATH, SETTINGS_3);
    buttonNamed(harness, 'Save').click();
    await settle(harness);

    expect(countOf(EXPORT_SETTINGS_PATH, 'POST')).toBe(2);
    expect(bodiesOf(EXPORT_SETTINGS_PATH)[1]).toEqual({
      revision: REV_S2,
      settings: { rights: 'CC BY' },
    });

    typeIn(harness, 'Copy path for docx', 'custom-reference.docx');
    copyButtonOf(harness, 'docx').click();
    await settle(harness);

    expect(bodiesOf(EXPORT_COPY_DEFAULT_PATH)).toEqual([
      { format: 'docx', path: 'custom-reference.docx' },
    ]);
  });

  it('G2 The copy rows suggest a path, and a copy shows its message', async () => {
    doubles.api.respond('POST', EXPORT_COPY_DEFAULT_PATH, {
      path: 'custom-reference.docx',
      hash: REV_S1,
      mtime: RAN_AT,
    });
    const harness = await renderPage('/projects/p1/manuscript');
    await until(harness, () => {
      fieldOf(harness, 'Copy path for docx');
    });

    expect(fieldOf(harness, 'Copy path for docx').value).toBe('reference.docx');
    expect(fieldOf(harness, 'Copy path for epub').value).toBe('epub.css');
    expect(fieldOf(harness, 'Copy path for pdf').value).toBe('template.typst');

    typeIn(harness, 'Copy path for docx', 'custom-reference.docx');
    copyButtonOf(harness, 'docx').click();
    await settle(harness);

    expect(panelOf(harness).textContent).toContain(
      'Copied the built-in docx template to custom-reference.docx.',
    );
  });

  it('G3 A cleared text field is sent as an empty string; the bibliography has no empty option; no change disables Save', async () => {
    doubles.api.respond('POST', EXPORT_SETTINGS_PATH, {
      revision: REV_S2,
      settings: { bibliography: 'all', lang: 'en' },
    });
    const harness = await renderPage('/projects/p1/manuscript');
    await until(harness, () => {
      fieldOf(harness, 'Author');
    });

    const bibliography = fieldOf(harness, 'Bibliography') as HTMLSelectElement;
    expect([...bibliography.options].map((option) => option.value)).toEqual([
      'off',
      'all',
      'cited',
    ]);
    expect(buttonNamed(harness, 'Save').disabled).toBe(true);
    expect(countOf(EXPORT_SETTINGS_PATH, 'POST')).toBe(0);

    typeIn(harness, 'Author', '');
    buttonNamed(harness, 'Save').click();
    await settle(harness);

    expect(bodiesOf(EXPORT_SETTINGS_PATH)).toEqual([
      { revision: REV_S1, settings: { author: '' } },
    ]);
  });

  it('G4 A conflict shows the message and a reload that reads the settings again', async () => {
    doubles.api.fail(
      'POST',
      EXPORT_SETTINGS_PATH,
      new ApiError(409, 'COMPILE_ORDER_CONFLICT', CONFLICT_TEXT),
    );
    const harness = await renderPage('/projects/p1/manuscript');
    await until(harness, () => {
      fieldOf(harness, 'Subtitle');
    });

    typeIn(harness, 'Subtitle', 'A Subtitle');
    buttonNamed(harness, 'Save').click();
    await settle(harness);

    const alert = panelOf(harness).querySelector('[role="alert"]');
    expect(alert?.textContent).toContain(CONFLICT_TEXT);

    buttonNamed(harness, 'Reload settings').click();
    await settle(harness);

    expect(countOf(EXPORT_SETTINGS_PATH, 'GET')).toBe(2);
    expect(countOf(EXPORT_SETTINGS_PATH, 'POST')).toBe(1);
  });

  it('G5 On the phone the settings are read, and every field, Save and copy button is disabled', async () => {
    const harness = await renderPage('/projects/p1/manuscript', 390, 844);
    await until(harness, () => {
      fieldOf(harness, 'Author');
    });

    expect(countOf(EXPORT_SETTINGS_PATH, 'GET')).toBe(1);
    const controls = [
      ...panelOf(harness).querySelectorAll<
        HTMLInputElement | HTMLSelectElement
      >('input, select'),
    ];
    expect(controls.length).toBeGreaterThan(0);
    for (const control of controls) {
      expect(control.disabled).toBe(true);
    }
    expect(buttonNamed(harness, 'Save').disabled).toBe(true);
    for (const format of ['docx', 'epub', 'pdf']) {
      expect(copyButtonOf(harness, format).disabled).toBe(true);
    }
    expect(countOf(EXPORT_SETTINGS_PATH, 'POST')).toBe(0);
    expect(countOf(EXPORT_COPY_DEFAULT_PATH, 'POST')).toBe(0);
  });

  it('G6 A project.yaml change reads the settings again; a change of drafts does not', async () => {
    const harness = await renderPage('/projects/p1/manuscript');
    await settle(harness);
    expect(countOf(EXPORT_SETTINGS_PATH)).toBe(1);

    push('project-store', {
      type: 'files-changed',
      data: { projectId: 'p1', paths: ['project.yaml'] },
    });
    await settle(harness);
    expect(countOf(EXPORT_SETTINGS_PATH)).toBe(2);

    push('project-store', {
      type: 'files-changed',
      data: { projectId: 'p1', paths: ['drafts/ch01.md'] },
    });
    await settle(harness);
    expect(countOf(EXPORT_SETTINGS_PATH)).toBe(2);
  });
});
