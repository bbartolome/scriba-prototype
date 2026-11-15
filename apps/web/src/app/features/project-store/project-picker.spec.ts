import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, type Routes } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { ApiError } from '../../shell/api-error';
import {
  createShellTestDoubles,
  type ShellTestDoubles,
} from '../../shell/testing/test-doubles';
import {
  ACTIVE_PROJECT_PATH,
  PROJECT_IMPORT_PATH,
  PROJECT_NEW_PATH,
  PROJECT_START_FROM_SAMPLE_PATH,
  PROJECTS_PATH,
  SAMPLES_PATH,
} from './project-store-contract';

@Component({ template: '<p>chat stub</p>' })
class ChatStub {}

// The picker is rendered through its own entry, with a stub for the chat page it navigates to.
const PICKER_ROUTES: Routes = [
  {
    path: 'projects',
    pathMatch: 'full',
    loadChildren: () =>
      import('./project-store.routes').then((feature) => feature.projectsRoutes),
  },
  { path: 'projects/:projectId/chat', component: ChatStub },
];

const EMPTY = { projects: [] };

const FIVE = {
  projects: [
    { id: 'alpha', title: 'Alpha', active: true, status: 'ok' },
    { id: 'beta', title: 'Beta', active: false, status: 'ok' },
    {
      id: 'gamma',
      title: 'Gamma',
      active: false,
      status: 'invalid',
      error: 'schemaVersion: Required',
    },
    { id: 'delta', title: 'Delta', active: false, status: 'too-new' },
    { id: 'epsilon', active: false, status: 'importable' },
  ],
};

const ALPHA_AND_BETA = {
  projects: [
    { id: 'alpha', title: 'Alpha', active: true, status: 'ok' },
    { id: 'beta', title: 'Beta', active: false, status: 'ok' },
  ],
};

const BETA_ACTIVE = {
  projects: [
    { id: 'alpha', title: 'Alpha', active: false, status: 'ok' },
    { id: 'beta', title: 'Beta', active: true, status: 'ok' },
  ],
};

const GAMMA_INVALID = {
  projects: [
    {
      id: 'gamma',
      title: 'Gamma',
      active: false,
      status: 'invalid',
      error: 'schemaVersion: Required',
    },
  ],
};

const NONFICTION = {
  id: 'nonfiction',
  title: 'Nonfiction',
  description: 'A sample book about one idea.',
};

let doubles: ShellTestDoubles;

beforeEach(() => {
  doubles = createShellTestDoubles();
  doubles.api.respond('GET', SAMPLES_PATH, []);
  TestBed.configureTestingModule({
    providers: [provideRouter(PICKER_ROUTES), ...doubles.providers],
  });
});

/** Renders the picker at /projects and lets the first reads settle. */
async function renderPicker(): Promise<RouterTestingHarness> {
  const harness = await RouterTestingHarness.create('/projects');
  await settle(harness);
  return harness;
}

async function settle(harness: RouterTestingHarness): Promise<void> {
  await harness.fixture.whenStable();
  harness.detectChanges();
  await harness.fixture.whenStable();
  harness.detectChanges();
}

function rootOf(harness: RouterTestingHarness): HTMLElement {
  return harness.fixture.nativeElement as HTMLElement;
}

function must<T>(value: T | null | undefined, what: string): T {
  if (value === null || value === undefined) throw new Error(`no ${what}`);
  return value;
}

function rowOf(scope: ParentNode, id: string): HTMLElement {
  const rows = [...scope.querySelectorAll<HTMLElement>('li')];
  return must(
    rows.find((row) => row.querySelector('code')?.textContent === id),
    `row ${id}`,
  );
}

function buttonIn(scope: ParentNode, name: string): HTMLButtonElement | undefined {
  return [...scope.querySelectorAll<HTMLButtonElement>('button')].find(
    (button) => button.textContent.trim() === name,
  );
}

function buttonsNamed(scope: ParentNode, name: string): HTMLButtonElement[] {
  return [...scope.querySelectorAll<HTMLButtonElement>('button')].filter(
    (button) => button.textContent.trim() === name,
  );
}

function hasExactText(scope: ParentNode, selector: string, text: string): boolean {
  return [...scope.querySelectorAll(selector)].some(
    (element) => element.textContent.trim() === text,
  );
}

function newForm(scope: ParentNode): HTMLFormElement {
  return must(
    scope.querySelector<HTMLFormElement>('form[aria-label="New project"]'),
    'New form',
  );
}

function fillInput(scope: ParentNode, name: string, value: string): void {
  const input = must(
    scope.querySelector<HTMLInputElement>(`input[name="${name}"]`),
    `input ${name}`,
  );
  input.value = value;
}

/** The bodies of the requests with a method and a path, in order. */
function bodiesOf(method: 'GET' | 'POST', path: string): unknown[] {
  return doubles.api.requests
    .filter((request) => request.method === method && request.path === path)
    .map((request) => request.body);
}

describe('project picker', () => {
  it('P1 lists each project with its status and offers only its actions', async () => {
    doubles.api.respond('GET', PROJECTS_PATH, FIVE);

    const harness = await renderPicker();
    const root = rootOf(harness);

    for (const [id, status] of [
      ['alpha', 'ok'],
      ['beta', 'ok'],
      ['gamma', 'invalid'],
      ['delta', 'too-new'],
      ['epsilon', 'importable'],
    ] as const) {
      expect(rowOf(root, id).textContent).toContain(status);
    }
    expect(rowOf(root, 'alpha').textContent).toContain('Active');
    expect(buttonsNamed(root, 'Switch')).toHaveLength(1);
    expect(buttonIn(rowOf(root, 'beta'), 'Switch')).toBeDefined();
    expect(buttonsNamed(root, 'Import')).toHaveLength(2);
    expect(buttonIn(rowOf(root, 'gamma'), 'Import')).toBeDefined();
    expect(buttonIn(rowOf(root, 'epsilon'), 'Import')).toBeDefined();
    expect(rowOf(root, 'delta').querySelectorAll('button')).toHaveLength(0);
    expect(rowOf(root, 'alpha').querySelectorAll('button')).toHaveLength(0);
    expect(hasExactText(root, 'p', 'schemaVersion: Required')).toBe(true);
  });

  it('P2 New posts the title alone, then activates the new project and opens its chat', async () => {
    doubles.api.respond('GET', PROJECTS_PATH, EMPTY);
    doubles.api.respond('POST', PROJECT_NEW_PATH, {
      id: 'my-book',
      title: 'My Book',
      genrePack: 'nonfiction',
      active: false,
      status: 'ok',
    });
    doubles.api.respond('POST', ACTIVE_PROJECT_PATH, { active: 'my-book' });
    const harness = await renderPicker();

    fillInput(newForm(rootOf(harness)), 'title', 'My Book');
    must(buttonIn(newForm(rootOf(harness)), 'Create project'), 'Create project').click();
    await settle(harness);

    expect(bodiesOf('POST', PROJECT_NEW_PATH)).toStrictEqual([
      { title: 'My Book' },
    ]);
    expect(bodiesOf('POST', ACTIVE_PROJECT_PATH)).toStrictEqual([
      { projectId: 'my-book' },
    ]);
    expect(TestBed.inject(Router).url).toBe('/projects/my-book/chat');
  });

  it('P3 shows an import refusal verbatim and keeps the Import button', async () => {
    doubles.api.respond('GET', PROJECTS_PATH, GAMMA_INVALID);
    doubles.api.fail(
      'POST',
      PROJECT_IMPORT_PATH,
      new ApiError(
        422,
        'PROJECT_INVALID',
        'project.yaml is not valid. The details list each issue.',
        [{ path: ['title'], message: 'Required' }],
      ),
    );
    const harness = await renderPicker();
    const root = rootOf(harness);

    must(buttonIn(rowOf(root, 'gamma'), 'Import'), 'Import').click();
    await settle(harness);

    expect(
      hasExactText(
        root,
        'p',
        'project.yaml is not valid. The details list each issue.',
      ),
    ).toBe(true);
    expect(hasExactText(root, 'li', 'title: Required')).toBe(true);
    expect(buttonIn(rowOf(root, 'gamma'), 'Import')).toBeDefined();
    expect(bodiesOf('POST', ACTIVE_PROJECT_PATH)).toStrictEqual([]);
  });

  it('P4 Start from sample posts the card form, then activates the new project', async () => {
    doubles.api.respond('GET', PROJECTS_PATH, EMPTY);
    doubles.api.respond('GET', SAMPLES_PATH, [NONFICTION]);
    doubles.api.respond('POST', PROJECT_START_FROM_SAMPLE_PATH, {
      id: 'demo-book',
      title: 'Demo book',
      genrePack: 'nonfiction',
      active: false,
      status: 'ok',
    });
    doubles.api.respond('POST', ACTIVE_PROJECT_PATH, { active: 'demo-book' });
    const harness = await renderPicker();
    const card = must(
      rootOf(harness).querySelector<HTMLElement>('section[aria-label="Nonfiction"]'),
      'Nonfiction card',
    );

    must(buttonIn(card, 'Start from sample'), 'Start from sample').click();
    await settle(harness);
    fillInput(card, 'folderName', 'demo-book');
    fillInput(card, 'title', 'Demo book');
    must(buttonIn(card, 'Create from sample'), 'Create from sample').click();
    await settle(harness);

    expect(bodiesOf('POST', PROJECT_START_FROM_SAMPLE_PATH)).toStrictEqual([
      { sampleId: 'nonfiction', folderName: 'demo-book', title: 'Demo book' },
    ]);
    expect(bodiesOf('POST', ACTIVE_PROJECT_PATH)).toStrictEqual([
      { projectId: 'demo-book' },
    ]);
    expect(TestBed.inject(Router).url).toBe('/projects/demo-book/chat');
  });

  it('P5 Switch posts the id and opens the project chat', async () => {
    doubles.api.respond('GET', PROJECTS_PATH, ALPHA_AND_BETA);
    doubles.api.respond('POST', ACTIVE_PROJECT_PATH, { active: 'beta' });
    const harness = await renderPicker();

    must(buttonIn(rowOf(rootOf(harness), 'beta'), 'Switch'), 'Switch').click();
    await settle(harness);

    expect(bodiesOf('POST', ACTIVE_PROJECT_PATH)).toStrictEqual([
      { projectId: 'beta' },
    ]);
    expect(TestBed.inject(Router).url).toBe('/projects/beta/chat');
  });

  it('P5 a refused switch shows its message and stays on the picker', async () => {
    const message = 'This project needs a newer Scriba.';
    doubles.api.respond('GET', PROJECTS_PATH, ALPHA_AND_BETA);
    doubles.api.fail(
      'POST',
      ACTIVE_PROJECT_PATH,
      new ApiError(409, 'PROJECT_SCHEMA_TOO_NEW', message),
    );
    const harness = await renderPicker();

    must(buttonIn(rowOf(rootOf(harness), 'beta'), 'Switch'), 'Switch').click();
    await settle(harness);

    expect(hasExactText(rootOf(harness), 'p', message)).toBe(true);
    expect(TestBed.inject(Router).url).toBe('/projects');
  });

  it('P6 a project-switched event from another tab updates the active marker', async () => {
    doubles.api.respond('GET', PROJECTS_PATH, ALPHA_AND_BETA);
    const harness = await renderPicker();
    const root = rootOf(harness);
    expect(rowOf(root, 'alpha').textContent).toContain('Active');
    expect(buttonIn(rowOf(root, 'beta'), 'Switch')).toBeDefined();

    doubles.api.respond('GET', PROJECTS_PATH, BETA_ACTIVE);
    doubles.events.push({
      module: 'project-store',
      type: 'project-switched',
      data: { from: 'alpha', to: 'beta' },
    });
    await settle(harness);

    expect(rowOf(root, 'beta').textContent).toContain('Active');
    expect(buttonIn(rowOf(root, 'alpha'), 'Switch')).toBeDefined();
    expect(
      doubles.api.requests.filter(
        (request) => request.method === 'GET' && request.path === PROJECTS_PATH,
      ),
    ).toHaveLength(2);
  });
});
