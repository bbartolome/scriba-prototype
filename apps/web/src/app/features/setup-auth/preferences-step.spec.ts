import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import {
  IDENTITY_ROUTE,
  PREFERENCES_ROUTE,
  SETUP_AUTH_EXAMPLES,
  SETUP_STATUS_ROUTE,
  type SetupStatus,
} from '@bbartolome/scriba-contracts/setup-auth';
import { BUILTIN_ORIGINS } from '@bbartolome/scriba-contracts/tool-registry';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { APP_ROUTES } from '../../app.routes';
import { ApiError, CLIENT_ERROR_CODES } from '../../shell/api-error';
import {
  restoreMatchMedia,
  stubMatchMedia,
} from '../../shell/testing/match-media';
import {
  createShellTestDoubles,
  type ShellTestDoubles,
} from '../../shell/testing/test-doubles';
import { ThemeToggle } from '../../shell';
import { ProvidersPanel } from '../providers/providers.routes';
import { GENRE_PACK_CHOICES } from './preferences-form';
import { StepBody } from './step-body';

/** Stands in for the Model providers panel, which makes its own reads. */
@Component({ selector: 'app-providers-panel', template: '' })
class ProvidersStub {}

const PREFERENCES_STEP_PATH = '/api/setup-auth/steps/preferences';
const THEME_KEY = 'scriba.theme';

/** The status at the preferences step: Access done, the step and the first project pending. */
const atPreferences = {
  steps: {
    access: 'done',
    tailscale: 'skipped',
    providers: 'skipped',
    preferences: 'pending',
    firstProject: 'pending',
  },
  complete: false,
  compose: SETUP_AUTH_EXAMPLES.composeOk,
} satisfies SetupStatus;

const preferencesDone = {
  ...atPreferences,
  steps: { ...atPreferences.steps, preferences: 'done' },
} satisfies SetupStatus;

const preferencesSkipped = {
  ...atPreferences,
  steps: { ...atPreferences.steps, preferences: 'skipped' },
} satisfies SetupStatus;

beforeEach(() => {
  stubMatchMedia(390, 844);
});

afterEach(() => {
  restoreMatchMedia();
  localStorage.removeItem(THEME_KEY);
  document.documentElement.removeAttribute('data-theme');
});

/** Renders `/setup` with the doubles. The providers panel is replaced by a stub. */
async function renderSetup(
  providers: ShellTestDoubles['providers'],
): Promise<RouterTestingHarness> {
  TestBed.overrideComponent(StepBody, {
    remove: { imports: [ProvidersPanel] },
    add: { imports: [ProvidersStub] },
  });
  TestBed.configureTestingModule({
    providers: [provideRouter(APP_ROUTES), ...providers],
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

/** The wizard's list items, each as `title: state`. */
function stepItems(root: HTMLElement): string[] {
  return [...root.querySelectorAll('li')].map((li) => li.textContent.trim());
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

function genrePackInput(root: HTMLElement): HTMLInputElement {
  const input = root.querySelector<HTMLInputElement>(
    'input[name="defaultGenrePack"]',
  );
  if (!input) {
    throw new Error('The genre pack input is not rendered.');
  }
  return input;
}

/** Types a value into an input, as the user does. */
function type(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

/**
 * Renders `/setup` at the preferences step: answers the identity, the status and the stored
 * preferences, then clicks Next three times from Access.
 */
async function renderAtPreferences(
  doubles: ShellTestDoubles,
): Promise<RouterTestingHarness> {
  doubles.api.respond('GET', IDENTITY_ROUTE, SETUP_AUTH_EXAMPLES.identityLoopback);
  doubles.api.respond('GET', SETUP_STATUS_ROUTE, atPreferences);
  doubles.api.respond('GET', PREFERENCES_ROUTE, SETUP_AUTH_EXAMPLES.preferences);

  const harness = await renderSetup(doubles.providers);
  await settle(harness, (root) =>
    expect(buttonTexts(root)).toEqual(['Next', 'Skip the rest']),
  );

  buttonNamed(rootOf(harness), 'Next')?.click();
  await settle(harness, (root) =>
    expect(paragraphs(root)).toContain('Tailscale is unavailable.'),
  );
  buttonNamed(rootOf(harness), 'Next')?.click();
  await settle(harness, (root) =>
    expect(paragraphs(root)).toContain('Model providers are not set up yet.'),
  );
  buttonNamed(rootOf(harness), 'Next')?.click();
  await settle(harness, (root) =>
    expect(buttonNamed(root, 'Save preferences')).not.toBeNull(),
  );
  return harness;
}

describe('preferences step with the fake API', () => {
  it('PR1 prefills the stored values, and saving only a changed genre pack posts only that field and marks the step done', async () => {
    const doubles = createShellTestDoubles();
    doubles.api.respond('POST', PREFERENCES_ROUTE, {
      authorName: 'Ada',
      defaultGenrePack: 'nonfiction',
    });
    doubles.api.respond('POST', PREFERENCES_STEP_PATH, preferencesDone);

    const harness = await renderAtPreferences(doubles);
    const root = rootOf(harness);

    expect(
      root.querySelector<HTMLInputElement>('input[name="authorName"]')?.value,
    ).toBe('Ada');
    expect(genrePackInput(root).value).toBe('mystery');

    const before = doubles.api.requests.length;
    type(genrePackInput(root), 'nonfiction');
    await settle(harness, (r) =>
      expect(buttonNamed(r, 'Save preferences')?.disabled).toBe(false),
    );
    buttonNamed(rootOf(harness), 'Save preferences')?.click();

    await settle(harness, (r) =>
      expect(stepItems(r)).toContain('Preferences: done'),
    );
    expect(doubles.api.requests.slice(before)).toStrictEqual([
      {
        method: 'POST',
        path: PREFERENCES_ROUTE,
        body: { defaultGenrePack: 'nonfiction' },
      },
      {
        method: 'POST',
        path: PREFERENCES_STEP_PATH,
        body: { state: 'done' },
      },
    ]);
    expect(buttonNamed(rootOf(harness), 'Save preferences')).not.toBeNull();
  });

  it("PR2 the theme toggle is the Shell's ThemeToggle, and choosing a theme makes no server call", async () => {
    const doubles = createShellTestDoubles();
    const harness = await renderAtPreferences(doubles);

    expect(
      harness.fixture.debugElement.queryAll(By.directive(ThemeToggle)),
    ).toHaveLength(1);
    const toggle = rootOf(harness).querySelector('app-theme-toggle');
    expect(toggle?.querySelector('[aria-label="Theme"]')).not.toBeNull();

    const before = doubles.api.requests.length;
    const dark = [...(toggle?.querySelectorAll('button') ?? [])].find(
      (button) => button.textContent.trim() === 'Dark',
    );
    dark?.click();
    await settle(harness, () => {
      expect(localStorage.getItem(THEME_KEY)).toBe('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });
    expect(doubles.api.requests.length).toBe(before);
  });

  it('PR3 the genre pack input lists the built-in choices in a datalist', async () => {
    const doubles = createShellTestDoubles();
    const harness = await renderAtPreferences(doubles);
    const root = rootOf(harness);

    expect(genrePackInput(root).getAttribute('list')).toBe('genre-pack-choices');
    const options = [
      ...root.querySelectorAll<HTMLOptionElement>(
        'datalist#genre-pack-choices option',
      ),
    ].map((option) => option.value);
    expect(options).toStrictEqual(['nonfiction', 'fiction']);
    expect(options).toStrictEqual([...GENRE_PACK_CHOICES]);
  });

  it('PR4 Next writes nothing and moves on', async () => {
    const doubles = createShellTestDoubles();
    const harness = await renderAtPreferences(doubles);

    const before = doubles.api.requests.length;
    buttonNamed(rootOf(harness), 'Next')?.click();
    await settle(harness, (root) =>
      expect(buttonNamed(root, 'Save preferences')).toBeNull(),
    );
    expect(
      doubles.api.requests.slice(before).filter((r) => r.method === 'POST'),
    ).toStrictEqual([]);
  });

  it('PR5 Skip writes skipped and moves on, and Mark done is not shown on the preferences step', async () => {
    const doubles = createShellTestDoubles();
    doubles.api.respond('POST', PREFERENCES_STEP_PATH, preferencesSkipped);
    const harness = await renderAtPreferences(doubles);

    expect(buttonTexts(rootOf(harness))).toEqual(
      expect.arrayContaining(['Save preferences', 'Skip', 'Next', 'Skip the rest']),
    );
    expect(buttonTexts(rootOf(harness))).not.toContain('Mark done');

    const before = doubles.api.requests.length;
    buttonNamed(rootOf(harness), 'Skip')?.click();
    await settle(harness, (root) =>
      expect(buttonNamed(root, 'Save preferences')).toBeNull(),
    );
    expect(doubles.api.requests.slice(before)).toStrictEqual([
      {
        method: 'POST',
        path: PREFERENCES_STEP_PATH,
        body: { state: 'skipped' },
      },
    ]);
  });

  it('PR6 a failed save shows its message, keeps the draft, and writes no step state', async () => {
    const doubles = createShellTestDoubles();
    doubles.api.fail(
      'POST',
      PREFERENCES_ROUTE,
      new ApiError(
        500,
        CLIENT_ERROR_CODES.UNEXPECTED_RESPONSE,
        'The server sent an unexpected response.',
      ),
    );
    const harness = await renderAtPreferences(doubles);

    type(genrePackInput(rootOf(harness)), 'fiction');
    await settle(harness, (root) =>
      expect(buttonNamed(root, 'Save preferences')?.disabled).toBe(false),
    );
    buttonNamed(rootOf(harness), 'Save preferences')?.click();

    await settle(harness, (root) => {
      const alert = root.querySelector('[role="alert"]');
      expect(alert?.textContent.trim()).toBe(
        'The server sent an unexpected response.',
      );
      expect(buttonNamed(root, 'Save preferences')).not.toBeNull();
      expect(genrePackInput(root).value).toBe('fiction');
    });
    expect(
      doubles.api.requests.filter((r) => r.path === PREFERENCES_STEP_PATH),
    ).toStrictEqual([]);
  });

  it('PR7 the stored values are read when the step is shown, not at load', async () => {
    const doubles = createShellTestDoubles();
    doubles.api.respond('GET', IDENTITY_ROUTE, SETUP_AUTH_EXAMPLES.identityLoopback);
    doubles.api.respond('GET', SETUP_STATUS_ROUTE, atPreferences);
    doubles.api.respond('GET', PREFERENCES_ROUTE, SETUP_AUTH_EXAMPLES.preferences);

    const harness = await renderSetup(doubles.providers);
    await settle(harness, (root) =>
      expect(buttonTexts(root)).toEqual(['Next', 'Skip the rest']),
    );

    buttonNamed(rootOf(harness), 'Next')?.click();
    await settle(harness, (root) =>
      expect(paragraphs(root)).toContain('Tailscale is unavailable.'),
    );
    buttonNamed(rootOf(harness), 'Next')?.click();
    await settle(harness, (root) =>
      expect(paragraphs(root)).toContain('Model providers are not set up yet.'),
    );
    const readsBefore = doubles.api.requests.filter(
      (r) => r.method === 'GET' && r.path === PREFERENCES_ROUTE,
    );
    expect(readsBefore).toStrictEqual([]);

    buttonNamed(rootOf(harness), 'Next')?.click();
    await settle(harness, (root) =>
      expect(buttonNamed(root, 'Save preferences')).not.toBeNull(),
    );
    expect(
      doubles.api.requests.filter(
        (r) => r.method === 'GET' && r.path === PREFERENCES_ROUTE,
      ),
    ).toStrictEqual([{ method: 'GET', path: PREFERENCES_ROUTE }]);
  });

  it('PR8 every genre choice is a built-in pack other than core', () => {
    for (const choice of GENRE_PACK_CHOICES) {
      expect(BUILTIN_ORIGINS).toContain(choice);
      expect(choice).not.toBe('core');
    }
  });
});
