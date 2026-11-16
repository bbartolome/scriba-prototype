import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import {
  ACTIVE_PROJECT_ROUTE,
  PROJECT_IMPORT_ROUTE,
  PROJECT_NEW_ROUTE,
  PROJECT_START_FROM_SAMPLE_ROUTE,
  PROJECTS_ROUTE,
  SAMPLES_ROUTE,
} from '@bbartolome/scriba-contracts/project-store';
import {
  IDENTITY_ROUTE,
  PREFERENCES_ROUTE,
  SETUP_AUTH_EXAMPLES,
  SETUP_STATUS_ROUTE,
  SETUP_STEP_ROUTE,
  type SetupStatus,
} from '@bbartolome/scriba-contracts/setup-auth';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { APP_ROUTES } from '../../app.routes';
import type { ApiPath } from '../../shell/api-client';
import { ApiError } from '../../shell/api-error';
import type { RecordedRequest } from '../../shell/testing/test-doubles';
import {
  restoreMatchMedia,
  stubMatchMedia,
} from '../../shell/testing/match-media';
import {
  createShellTestDoubles,
  type ShellTestDoubles,
} from '../../shell/testing/test-doubles';
import { ProvidersPanel } from '../providers/providers.routes';
import { StepBody } from './step-body';

const STEP_PATH = SETUP_STEP_ROUTE.replace(':step', 'firstProject') as ApiPath;

const atFirstProject = {
  steps: {
    access: 'done',
    tailscale: 'skipped',
    providers: 'skipped',
    preferences: 'skipped',
    firstProject: 'pending',
  },
  complete: false,
  compose: SETUP_AUTH_EXAMPLES.composeOk,
} satisfies SetupStatus;

const firstProjectDone = {
  ...atFirstProject,
  steps: { ...atFirstProject.steps, firstProject: 'done' },
} satisfies SetupStatus;

const sample = {
  id: 'nonfiction',
  title: 'Nonfiction',
  description: 'A short book.',
};

const myBookActive = {
  id: 'my-book',
  title: 'My Book',
  genrePack: 'mystery',
  active: true,
  status: 'ok',
};

const oldDraftImportable = {
  id: 'old-draft',
  active: false,
  status: 'importable',
};

const L0 = { projects: [] };
const L1 = { projects: [myBookActive, oldDraftImportable] };
const mySampleActive = {
  id: 'my-sample',
  title: 'My Sample',
  genrePack: 'nonfiction',
  active: true,
  status: 'ok',
};
const L2 = {
  projects: [
    { ...myBookActive, active: false },
    oldDraftImportable,
    mySampleActive,
  ],
};

beforeEach(() => {
  stubMatchMedia(390, 844);
});

afterEach(() => {
  restoreMatchMedia();
});

/** Stands in for the Model providers panel, which makes its own reads. */
@Component({ selector: 'app-providers-panel', template: '' })
class ProvidersStub {}

/** Stands in for the `/providers` route that MPR-11 adds. */
@Component({ template: '' })
class ProvidersRouteStub {}

/**
 * Answers every read and write the wizard can make, so each test overrides only what it needs.
 * The projects answer is L0 until a test sets another.
 */
function respondAll(doubles: ShellTestDoubles): void {
  doubles.api.respond('GET', IDENTITY_ROUTE, SETUP_AUTH_EXAMPLES.identityLoopback);
  doubles.api.respond('GET', SETUP_STATUS_ROUTE, atFirstProject);
  doubles.api.respond('GET', PREFERENCES_ROUTE, SETUP_AUTH_EXAMPLES.preferences);
  doubles.api.respond('GET', PROJECTS_ROUTE, L0);
  doubles.api.respond('GET', SAMPLES_ROUTE, [sample]);
  doubles.api.respond('POST', PROJECT_NEW_ROUTE, {
    id: 'my-book',
    active: false,
    status: 'ok',
  });
  doubles.api.respond('POST', PROJECT_IMPORT_ROUTE, {
    id: 'old-draft',
    active: false,
    status: 'ok',
  });
  doubles.api.respond('POST', PROJECT_START_FROM_SAMPLE_ROUTE, {
    id: 'my-sample',
    active: false,
    status: 'ok',
  });
  doubles.api.respond('POST', ACTIVE_PROJECT_ROUTE, { active: 'my-book' });
  doubles.api.respond('POST', STEP_PATH, firstProjectDone);
}

/** Renders `/setup` with the given doubles. The providers panel is replaced by a stub. */
async function renderSetup(
  doubles: ShellTestDoubles,
): Promise<RouterTestingHarness> {
  TestBed.overrideComponent(StepBody, {
    remove: { imports: [ProvidersPanel] },
    add: { imports: [ProvidersStub] },
  });
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'providers', component: ProvidersRouteStub },
        ...APP_ROUTES,
      ]),
      ...doubles.providers,
    ],
  });
  return RouterTestingHarness.create('/setup');
}

function rootOf(harness: RouterTestingHarness): HTMLElement {
  const root = harness.routeNativeElement;
  if (!root) {
    throw new Error('The setup page is not rendered.');
  }
  return root;
}

function paragraphs(root: HTMLElement): string[] {
  return [...root.querySelectorAll('p')].map((p) => p.textContent.trim());
}

function buttonTexts(root: HTMLElement): string[] {
  return [...root.querySelectorAll('button')].map((b) => b.textContent.trim());
}

/** The button whose trimmed text is `text`, or null. */
function buttonNamed(
  root: HTMLElement,
  text: string,
): HTMLButtonElement | null {
  return (
    [...root.querySelectorAll('button')].find(
      (button) => button.textContent.trim() === text,
    ) ?? null
  );
}

/** The buttons whose trimmed text is `text`. */
function buttonsNamed(root: HTMLElement, text: string): HTMLButtonElement[] {
  return [...root.querySelectorAll('button')].filter(
    (button) => button.textContent.trim() === text,
  );
}

/** The wizard's list items, each as `title: state`. */
function stepItems(root: HTMLElement): string[] {
  return [...root.querySelectorAll('li')].map((li) => li.textContent.trim());
}

function fieldNamed(root: HTMLElement, name: string): HTMLInputElement {
  const field = root.querySelector(`input[name="${name}"]`);
  if (!(field instanceof HTMLInputElement)) {
    throw new Error(`No input named ${name}.`);
  }
  return field;
}

function sampleSelect(root: HTMLElement): HTMLSelectElement {
  const select = root.querySelector('select[name="sample"]');
  if (!(select instanceof HTMLSelectElement)) {
    throw new Error('No sample select.');
  }
  return select;
}

/** Runs a check until it passes, with change detection before each try. */
async function settle(
  harness: RouterTestingHarness,
  check: (root: HTMLElement) => void,
): Promise<void> {
  await vi.waitFor(
    () => {
      harness.detectChanges();
      check(rootOf(harness));
    },
    { timeout: 5000 },
  );
}

/** A request without its params or body, for the checks of the reads. */
function bare(request: RecordedRequest): { method: string; path: string } {
  return { method: request.method, path: request.path };
}

/**
 * The entry check (S13): the slice of requests after a `Next` that enters the step has no POST; its
 * last three requests are the step's own reads in order; every earlier request is the preferences
 * read of the previous step (SAU-13 reads it after an await); and there is one read each of the
 * list and of the samples.
 */
function entryReads(slice: RecordedRequest[]): void {
  expect(slice.filter((request) => request.method === 'POST')).toStrictEqual(
    [],
  );
  expect(slice.slice(-3).map(bare)).toStrictEqual([
    { method: 'GET', path: PROJECTS_ROUTE },
    { method: 'GET', path: SAMPLES_ROUTE },
    { method: 'GET', path: PREFERENCES_ROUTE },
  ]);
  for (const earlier of slice.slice(0, -3)) {
    expect(bare(earlier)).toStrictEqual({
      method: 'GET',
      path: PREFERENCES_ROUTE,
    });
  }
  expect(
    slice.filter((request) => request.path === PROJECTS_ROUTE),
  ).toHaveLength(1);
  expect(
    slice.filter((request) => request.path === SAMPLES_ROUTE),
  ).toHaveLength(1);
}

/**
 * Enters the first-project step with four Next clicks from Access. Each click waits for its
 * settled state. Returns the request count taken right before the fourth click.
 */
async function enterStep(
  harness: RouterTestingHarness,
  doubles: ShellTestDoubles,
): Promise<number> {
  await settle(harness, (root) =>
    expect(buttonTexts(root)).toEqual(['Next', 'Skip the rest']),
  );
  for (let click = 1; click <= 3; click++) {
    buttonNamed(rootOf(harness), 'Next')?.click();
    await settle(harness, (root) => {
      expect(stepItems(root)).toHaveLength(5);
      expect(buttonNamed(root, 'New project')).toBeNull();
      expect(buttonNamed(root, 'Next')).not.toBeNull();
    });
  }
  const from = doubles.api.requests.length;
  buttonNamed(rootOf(harness), 'Next')?.click();
  await settle(harness, (root) => {
    expect(buttonNamed(root, 'New project')).not.toBeNull();
    expect(root.querySelectorAll('option').length).toBeGreaterThan(0);
    const last = doubles.api.requests.at(-1);
    expect(last === undefined ? undefined : bare(last)).toStrictEqual({
      method: 'GET',
      path: PREFERENCES_ROUTE,
    });
  });
  return from;
}

describe('first-project step with the fake API', () => {
  it('F1 entering the step only reads; New carries the default genre pack and activates and marks the step done; Import only lists; Start from sample activates and marks the step done', async () => {
    const doubles = createShellTestDoubles();
    respondAll(doubles);
    const harness = await renderSetup(doubles);

    // (0) Entry: the step only reads. With no project active, Mark done is disabled.
    const entryFrom = await enterStep(harness, doubles);
    entryReads(doubles.api.requests.slice(entryFrom));
    await settle(harness, (root) =>
      expect(buttonNamed(root, 'Mark done')?.disabled).toBe(true),
    );

    // (a) New with the stored genre pack: create, activate, mark the step done, then re-read.
    doubles.api.respond('GET', PROJECTS_ROUTE, L1);
    let from = doubles.api.requests.length;
    fieldNamed(rootOf(harness), 'newTitle').value = 'My Book';
    buttonNamed(rootOf(harness), 'New project')?.click();
    expect(doubles.api.requests.slice(from).map(bareWithBody)).toStrictEqual([
      {
        method: 'POST',
        path: PROJECT_NEW_ROUTE,
        body: { title: 'My Book', genrePack: 'mystery' },
      },
      {
        method: 'POST',
        path: ACTIVE_PROJECT_ROUTE,
        body: { projectId: 'my-book' },
      },
      { method: 'POST', path: STEP_PATH, body: { state: 'done' } },
      { method: 'GET', path: PROJECTS_ROUTE },
    ]);
    await settle(harness, (root) =>
      expect(buttonNamed(root, 'Mark done')?.disabled).toBe(false),
    );

    // (b) Import: one POST of the folder, then a re-read. No activation.
    await settle(harness, (root) =>
      expect(buttonsNamed(root, 'Import')).toHaveLength(1),
    );
    from = doubles.api.requests.length;
    buttonsNamed(rootOf(harness), 'Import')[0]?.click();
    expect(doubles.api.requests.slice(from).map(bareWithBody)).toStrictEqual([
      {
        method: 'POST',
        path: PROJECT_IMPORT_ROUTE,
        body: { projectId: 'old-draft' },
      },
      { method: 'GET', path: PROJECTS_ROUTE },
    ]);

    // (c) Start from sample: create, activate, mark the step done, then re-read.
    doubles.api.respond('GET', PROJECTS_ROUTE, L2);
    from = doubles.api.requests.length;
    sampleSelect(rootOf(harness)).value = 'nonfiction';
    fieldNamed(rootOf(harness), 'sampleTitle').value = 'My Sample';
    fieldNamed(rootOf(harness), 'sampleFolder').value = 'my-sample';
    doubles.api.respond('POST', ACTIVE_PROJECT_ROUTE, { active: 'my-sample' });
    buttonNamed(rootOf(harness), 'Start from sample')?.click();
    expect(doubles.api.requests.slice(from).map(bareWithBody)).toStrictEqual([
      {
        method: 'POST',
        path: PROJECT_START_FROM_SAMPLE_ROUTE,
        body: {
          sampleId: 'nonfiction',
          folderName: 'my-sample',
          title: 'My Sample',
        },
      },
      {
        method: 'POST',
        path: ACTIVE_PROJECT_ROUTE,
        body: { projectId: 'my-sample' },
      },
      { method: 'POST', path: STEP_PATH, body: { state: 'done' } },
      { method: 'GET', path: PROJECTS_ROUTE },
    ]);
  });

  it('F2 a re-run lists the existing projects and sends no write', async () => {
    const doubles = createShellTestDoubles();
    respondAll(doubles);
    doubles.api.respond('GET', PROJECTS_ROUTE, L1);
    const harness = await renderSetup(doubles);

    const from = await enterStep(harness, doubles);
    entryReads(doubles.api.requests.slice(from));

    const from2 = doubles.api.requests.length;
    await settle(harness, (root) => {
      expect(paragraphs(root).some((text) => text.includes('My Book'))).toBe(
        true,
      );
      expect(paragraphs(root).some((text) => text.includes('old-draft'))).toBe(
        true,
      );
    });
    expect(doubles.api.requests.slice(from2)).toStrictEqual([]);
    await settle(harness, (root) => {
      expect(buttonsNamed(root, 'Import')).toHaveLength(1);
      expect(buttonsNamed(root, 'Open')).toHaveLength(0);
      expect(buttonNamed(root, 'Mark done')?.disabled).toBe(false);
    });
  });

  it('F3 Open activates the chosen project and marks the step done, and creates nothing', async () => {
    const doubles = createShellTestDoubles();
    respondAll(doubles);
    const other = { id: 'other', active: false, status: 'ok' };
    doubles.api.respond('GET', PROJECTS_ROUTE, {
      projects: [myBookActive, other],
    });
    doubles.api.respond('POST', ACTIVE_PROJECT_ROUTE, { active: 'other' });
    const harness = await renderSetup(doubles);

    await enterStep(harness, doubles);
    await settle(harness, (root) =>
      expect(buttonsNamed(root, 'Open')).toHaveLength(1),
    );
    const from = doubles.api.requests.length;
    buttonsNamed(rootOf(harness), 'Open')[0]?.click();
    expect(doubles.api.requests.slice(from).map(bareWithBody)).toStrictEqual([
      {
        method: 'POST',
        path: ACTIVE_PROJECT_ROUTE,
        body: { projectId: 'other' },
      },
      { method: 'POST', path: STEP_PATH, body: { state: 'done' } },
      { method: 'GET', path: PROJECTS_ROUTE },
    ]);
  });

  it('F4 a refused New shows its message and makes no activation', async () => {
    const doubles = createShellTestDoubles();
    respondAll(doubles);
    const message =
      'A folder name cannot be made from this title. Give a folder name.';
    doubles.api.fail(
      'POST',
      PROJECT_NEW_ROUTE,
      new ApiError(400, 'PLATFORM_VALIDATION_FAILED', message),
    );
    const harness = await renderSetup(doubles);

    await enterStep(harness, doubles);
    const from = doubles.api.requests.length;
    fieldNamed(rootOf(harness), 'newTitle').value = 'Cafe';
    buttonNamed(rootOf(harness), 'New project')?.click();

    await settle(harness, (root) => {
      const alert = root.querySelector('[role="alert"]');
      expect(alert?.textContent.trim()).toBe(message);
    });
    expect(doubles.api.requests.slice(from).map(bareWithBody)).toStrictEqual([
      {
        method: 'POST',
        path: PROJECT_NEW_ROUTE,
        body: { title: 'Cafe', genrePack: 'mystery' },
      },
    ]);
  });

  it('F5 New sends no genre pack when none is stored', async () => {
    const doubles = createShellTestDoubles();
    respondAll(doubles);
    doubles.api.respond('GET', PREFERENCES_ROUTE, SETUP_AUTH_EXAMPLES.preferencesEmpty);
    const harness = await renderSetup(doubles);

    await enterStep(harness, doubles);
    const from = doubles.api.requests.length;
    fieldNamed(rootOf(harness), 'newTitle').value = 'My Book';
    buttonNamed(rootOf(harness), 'New project')?.click();

    const first = doubles.api.requests.slice(from)[0];
    expect(first).toStrictEqual({
      method: 'POST',
      path: PROJECT_NEW_ROUTE,
      body: { title: 'My Book' },
    });
  });
});

/** The request without the `params` key, with its body. */
function bareWithBody(request: RecordedRequest): {
  method: string;
  path: string;
  body?: unknown;
} {
  return request.body === undefined
    ? { method: request.method, path: request.path }
    : { method: request.method, path: request.path, body: request.body };
}
