import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { SseEnvelope } from '@bbartolome/scriba-contracts/platform';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from 'vitest';
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
  EXPORT_PATH,
  EXPORT_SETTINGS_PATH,
  PREFLIGHT_PATH,
} from './export-contract';
import { MANUSCRIPT_PATH } from './manuscript-contract';
import { SNAPSHOTS_PATH } from './snapshot-contract';

const WAIT = { timeout: 5000 };
const REV1 = `sha256:${'1'.repeat(64)}`;
const REV2 = `sha256:${'2'.repeat(64)}`;
const RAN_AT = '2026-11-19T10:15:00Z';

const CHECK_IDS = [
  'placeholders',
  'unsupported-claims',
  'orphan-scenes',
  'entity-links',
  'banned-phrases',
] as const;

const CHECK_LABELS = [
  'Placeholders',
  'Unsupported claims',
  'Orphan scenes',
  'Entity links',
  'Banned phrases',
];

interface Finding {
  check: string;
  severity: 'error' | 'warning' | 'info';
  path: string;
  line?: number;
  offset?: number;
  message: string;
}

/** A finding, with its line and offset only when given. */
function finding(
  check: string,
  severity: Finding['severity'],
  path: string,
  line?: number,
  offset?: number,
  message = 'A finding.',
): Finding {
  return {
    check,
    severity,
    path,
    message,
    ...(line === undefined ? {} : { line }),
    ...(offset === undefined ? {} : { offset }),
  };
}

/** A preflight answer: every check, with the findings of that check. */
function preflightOf(findings: Finding[]) {
  return {
    ranAt: RAN_AT,
    revision: REV1,
    checks: CHECK_IDS.map((id) => {
      const own = findings.filter((item) => item.check === id);
      return { id, status: own.length > 0 ? 'fail' : 'pass', findings: own };
    }),
  };
}

const CLEAN = preflightOf([]);
const ONE_ERROR = preflightOf([
  finding('placeholders', 'error', 'drafts/ch01.md', 3, 40, 'TK'),
]);

const SUMMARY = {
  ranAt: RAN_AT,
  revision: REV1,
  errors: 0,
  warnings: 0,
  infos: 0,
};

/** The answer of an export of one format, with no errors and one warning. */
function exportOf(format: string) {
  return {
    format,
    fileName: `book.${format}`,
    bytes: 1234,
    downloadUrl: `/api/compile-export/exports/${format}`,
    preflight: SUMMARY,
    warnings: [`Warning of ${format}.`],
  };
}

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
  revision: REV1,
};

const SETTINGS_VIEW = {
  revision: REV1,
  settings: { bibliography: 'all', lang: 'en' },
};

let doubles: ShellTestDoubles;
let confirm: MockInstance<typeof window.confirm>;

beforeEach(() => {
  doubles = createShellTestDoubles();
  doubles.api.respond('GET', MANUSCRIPT_PATH, MANUSCRIPT_VIEW);
  doubles.api.respond('GET', SNAPSHOTS_PATH, { snapshots: [] });
  doubles.api.respond('GET', EXPORT_SETTINGS_PATH, SETTINGS_VIEW);
  confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
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

/** The preflight panel element of the rendered route. */
function panelOf(harness: RouterTestingHarness): HTMLElement {
  const panel = (harness.routeNativeElement as HTMLElement).querySelector(
    'app-preflight-panel',
  );
  if (!(panel instanceof HTMLElement)) throw new Error('No preflight panel.');
  return panel;
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

/** Clicks a button of the panel, then lets the request it starts finish. */
async function click(
  harness: RouterTestingHarness,
  text: string,
): Promise<void> {
  buttonNamed(harness, text).click();
  await settle(harness);
}

/** The finding items of the panel, found by the path of their link. */
function findingFor(harness: RouterTestingHarness, path: string): HTMLElement {
  const item = [
    ...panelOf(harness).querySelectorAll<HTMLElement>('li[data-finding]'),
  ].find((row) => {
    const href = row.querySelector('a')?.getAttribute('href') ?? '';
    return new URL(href, 'http://x').searchParams.get('path') === path;
  });
  if (!item) throw new Error(`No finding for ${path}.`);
  return item;
}

/** The download anchor of the panel, if an export is shown. */
function downloadOf(harness: RouterTestingHarness): HTMLAnchorElement | null {
  return panelOf(harness).querySelector<HTMLAnchorElement>('a[download]');
}

describe('PreflightPanel', () => {
  it('R1 Preflight errors open the confirm dialog before export; cancelling sends no export.', async () => {
    doubles.api.respond('POST', PREFLIGHT_PATH, ONE_ERROR);
    doubles.api.respond('POST', EXPORT_PATH, exportOf('docx'));
    const harness = await renderPage('/projects/p1/manuscript');
    await settle(harness);

    await click(harness, 'Run preflight');
    await click(harness, 'Export docx');

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(confirm).toHaveBeenLastCalledWith('1 error. Export anyway?');
    expect(countOf(EXPORT_PATH, 'POST')).toBe(0);

    confirm.mockReturnValue(true);
    await click(harness, 'Export docx');

    expect(confirm).toHaveBeenCalledTimes(2);
    expect(countOf(EXPORT_PATH, 'POST')).toBe(1);
    expect(bodiesOf(EXPORT_PATH)).toEqual([{ format: 'docx' }]);

    doubles.api.respond('POST', PREFLIGHT_PATH, CLEAN);
    doubles.api.respond('POST', EXPORT_PATH, exportOf('md'));
    await click(harness, 'Run preflight');
    await click(harness, 'Export md');

    expect(confirm).toHaveBeenCalledTimes(2);
    expect(bodiesOf(EXPORT_PATH)).toEqual([
      { format: 'docx' },
      { format: 'md' },
    ]);
  });

  it('R2 Findings link to their file and line.', async () => {
    doubles.api.respond(
      'POST',
      PREFLIGHT_PATH,
      preflightOf([
        finding('placeholders', 'error', 'drafts/ch01.md', 3, 40, 'TK'),
        finding('unsupported-claims', 'error', 'drafts/ch02.md', 12),
        finding('banned-phrases', 'warning', 'drafts/ch03.md', 1),
        finding('orphan-scenes', 'info', 'project.yaml'),
      ]),
    );
    const harness = await renderPage('/projects/p1/manuscript');
    await settle(harness);
    await click(harness, 'Run preflight');

    const links = [
      ['drafts/ch01.md', 3, 40],
      ['drafts/ch02.md', 12, undefined],
      ['drafts/ch03.md', 1, undefined],
    ] as const;
    for (const [path, line, offset] of links) {
      const href = findingFor(harness, path)
        .querySelector('a')
        ?.getAttribute('href');
      const url = new URL(href ?? '', 'http://x');
      expect(url.pathname).toBe('/projects/p1/files');
      expect(url.searchParams.get('path')).toBe(path);
      expect(url.searchParams.get('line')).toBe(String(line));
      if (offset === undefined) {
        expect(url.searchParams.has('offset')).toBe(false);
      } else {
        expect(url.searchParams.get('offset')).toBe(String(offset));
      }
    }

    const last = findingFor(harness, 'project.yaml').querySelector('a');
    const lastUrl = new URL(last?.getAttribute('href') ?? '', 'http://x');
    expect(lastUrl.pathname).toBe('/projects/p1/files');
    expect(lastUrl.searchParams.get('path')).toBe('project.yaml');
    expect(lastUrl.searchParams.has('line')).toBe(false);
    expect(lastUrl.searchParams.has('offset')).toBe(false);
  });

  it('R3 Preflight is on demand and the findings are grouped by check', async () => {
    doubles.api.respond('POST', PREFLIGHT_PATH, ONE_ERROR);
    const harness = await renderPage('/projects/p1/manuscript');
    await settle(harness);
    expect(countOf(PREFLIGHT_PATH, 'POST')).toBe(0);

    await click(harness, 'Run preflight');

    expect(bodiesOf(PREFLIGHT_PATH)).toEqual([{}]);
    const sections = [
      ...panelOf(harness).querySelectorAll<HTMLElement>('[data-check]'),
    ];
    expect(
      sections.map((section) => section.getAttribute('data-check')),
    ).toEqual([...CHECK_IDS]);
    sections.forEach((section, index) => {
      expect(section.textContent).toContain(CHECK_LABELS[index] ?? '');
      expect(section.textContent).toMatch(/pass|fail/);
    });
    expect(sections[1]?.textContent).toContain('No findings.');
    expect(sections[0]?.textContent).toContain('fail');
  });

  it('R4 The export result shows the download and the warnings for each format', async () => {
    const harness = await renderPage('/projects/p1/manuscript');
    await settle(harness);

    for (const format of ['md', 'docx', 'epub', 'pdf']) {
      doubles.api.respond('POST', EXPORT_PATH, exportOf(format));
      await click(harness, `Export ${format}`);

      const download = downloadOf(harness);
      expect(download?.getAttribute('href')).toBe(
        `/api/compile-export/exports/${format}`,
      );
      expect(download?.textContent).toContain(`book.${format}`);
      expect(panelOf(harness).textContent).toContain('1234 bytes');
      expect(panelOf(harness).textContent).toContain(`Warning of ${format}.`);
    }
    expect(confirm).not.toHaveBeenCalled();
  });

  it('R5 A Pandoc error shows its message and no download', async () => {
    doubles.api.fail(
      'POST',
      EXPORT_PATH,
      new ApiError(
        500,
        'COMPILE_PANDOC_FAILED',
        'Pandoc failed (exit 43): Unknown option --x.',
      ),
    );
    const harness = await renderPage('/projects/p1/manuscript');
    await settle(harness);

    await click(harness, 'Export docx');

    const alert = panelOf(harness).querySelector('[role="alert"]');
    expect(alert?.textContent).toContain(
      'Pandoc failed (exit 43): Unknown option --x.',
    );
    expect(downloadOf(harness)).toBeNull();
  });

  it('R6 A manuscript refetch keeps the held preflight result', async () => {
    doubles.api.respond('POST', PREFLIGHT_PATH, ONE_ERROR);
    const harness = await renderPage('/projects/p1/manuscript');
    await settle(harness);
    await click(harness, 'Run preflight');

    push('compile-export', {
      type: 'manuscript-updated',
      data: { projectId: 'p1', revision: REV2 },
    });
    await settle(harness);
    expect(countOf(MANUSCRIPT_PATH)).toBe(2);

    await until(harness, () => {
      expect(findingFor(harness, 'drafts/ch01.md')).toBeDefined();
    });
    await click(harness, 'Export docx');
    expect(confirm).toHaveBeenCalledWith('1 error. Export anyway?');
    expect(countOf(EXPORT_PATH, 'POST')).toBe(0);
  });

  it('R7 On the phone, preflight and the export buttons are enabled and a download is shown', async () => {
    doubles.api.respond('POST', PREFLIGHT_PATH, CLEAN);
    doubles.api.respond('POST', EXPORT_PATH, exportOf('docx'));
    const harness = await renderPage('/projects/p1/manuscript', 390, 844);
    await settle(harness);

    expect(buttonNamed(harness, 'Run preflight').disabled).toBe(false);
    expect(buttonNamed(harness, 'Export docx').disabled).toBe(false);

    await click(harness, 'Run preflight');
    expect(countOf(PREFLIGHT_PATH, 'POST')).toBe(1);

    await click(harness, 'Export docx');
    expect(countOf(EXPORT_PATH, 'POST')).toBe(1);
    expect(downloadOf(harness)).not.toBeNull();
    expect(countOf(EXPORT_SETTINGS_PATH, 'POST')).toBe(0);
    expect(countOf(EXPORT_COPY_DEFAULT_PATH, 'POST')).toBe(0);
  });

  it('R8 Held results follow the project: another project shows none and exports without a confirm', async () => {
    doubles.api.respond('POST', PREFLIGHT_PATH, ONE_ERROR);
    doubles.api.respond('POST', EXPORT_PATH, exportOf('docx'));
    const harness = await renderPage('/projects/p1/manuscript');
    await settle(harness);
    await click(harness, 'Run preflight');
    expect(findingFor(harness, 'drafts/ch01.md')).toBeDefined();

    await harness.navigateByUrl('/projects/p2/manuscript');
    await settle(harness);

    expect(panelOf(harness).querySelectorAll('li[data-finding]')).toHaveLength(
      0,
    );
    expect(downloadOf(harness)).toBeNull();

    await click(harness, 'Export docx');
    expect(countOf(EXPORT_PATH, 'POST')).toBe(1);
    expect(confirm).not.toHaveBeenCalled();
  });
});
