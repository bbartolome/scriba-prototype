import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ACTIVE_PROJECT_ROUTE } from '@bbartolome/scriba-contracts/project-store';
import {
  HEALTHZ_ROUTE,
  VERSION_ROUTE,
  type Healthz,
  type VersionInfo,
} from '@bbartolome/scriba-contracts/platform';
import {
  APP_DEFAULT_ROUTE,
  PROVIDERS_EXAMPLES,
  PROVIDERS_ROUTE,
} from '@bbartolome/scriba-contracts/providers';
import {
  IDENTITY_ROUTE,
  SETUP_AUTH_EXAMPLES,
  SETUP_CONTINUE_ROUTE,
  SETUP_STATUS_ROUTE,
  type SetupStatus,
} from '@bbartolome/scriba-contracts/setup-auth';
import { Observable, Subject, of, throwError, take, mergeMap } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { APP_ROUTES } from '../../app.routes';
import {
  parseResponse,
  type ApiPath,
  type ResponseSchema,
} from '../../shell/api-client';
import { ApiError, CLIENT_ERROR_CODES } from '../../shell/api-error';
import {
  restoreMatchMedia,
  stubMatchMedia,
} from '../../shell/testing/match-media';
import {
  createShellTestDoubles,
  FakeApiClient,
  type ShellTestDoubles,
} from '../../shell/testing/test-doubles';
import { API_CLIENT } from '../../shell/tokens';
import { ProvidersPanel } from '../providers/providers.routes';
import { StepBody } from './step-body';

const version = {
  version: '1.2.3',
  revision: 'abc1234',
  builtAt: '2026-11-14T00:00:00Z',
  composeVersion: 1,
} satisfies VersionInfo;

const healthy = { status: 'ok', version: '1.2.3' } satisfies Healthz;

const complete = {
  ...SETUP_AUTH_EXAMPLES.setupStatus,
  complete: true,
} satisfies SetupStatus;

const LOOPBACK_TEXT = 'Signed in from this computer (loopback).';
const TAILNET_TEXT = 'Signed in over the tailnet as ada@example.com.';
const IN_TEXT = "You're in.";
// SAU-10 units/SAU-10-compose-version-status.md line 21: the re-run-the-installer one-liner.
const COMPOSE_ONE_LINER =
  'docker run --rm -e SETUP=true bbartolome/scriba | bash';
const SIGN_IN_COMMANDS = [
  'cat ~/Books/.scriba/setup-url',
  'docker compose logs scriba',
];
const IDENTITY_MISSING_TEXT =
  'Scriba did not get your Tailscale identity. Sign this device in to Tailscale as a user (a tagged device has no user identity), then open Scriba at its tailnet address again.';
const NOT_ALLOWED_TEXT =
  "This Tailscale login is not on the owner's allowlist. To change the allowlist, use the computer that runs Scriba and its setup link.";

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
 * Renders `/setup` with the given doubles. The providers panel is replaced by a stub, and a
 * `providers` route comes first, so the step embeds the stub whether or not MPR-11 is on `main`.
 */
async function renderSetup(
  providers: ShellTestDoubles['providers'],
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
      ...providers,
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

function codeTexts(root: HTMLElement): string[] {
  return [...root.querySelectorAll('code')].map((c) => c.textContent.trim());
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

/** Reads of the landing, which Skip the rest navigates to. */
function respondLanding(doubles: ShellTestDoubles): void {
  doubles.api.respond('GET', VERSION_ROUTE, version);
  doubles.api.respond('GET', HEALTHZ_ROUTE, healthy);
  doubles.api.respond('GET', SETUP_STATUS_ROUTE, complete);
  doubles.api.respond('GET', ACTIVE_PROJECT_ROUTE, { active: 'a' });
}

describe('C1 setup page with the fake API', () => {
  it('C1a shows the loopback identity, "You\'re in." and the Next and Skip the rest buttons', async () => {
    const doubles = createShellTestDoubles();
    doubles.api.respond(
      'GET',
      IDENTITY_ROUTE,
      SETUP_AUTH_EXAMPLES.identityLoopback,
    );
    doubles.api.respond(
      'GET',
      SETUP_STATUS_ROUTE,
      SETUP_AUTH_EXAMPLES.setupStatus,
    );

    const harness = await renderSetup(doubles.providers);

    await settle(harness, (root) => {
      expect(paragraphs(root)).toContain(LOOPBACK_TEXT);
      expect(paragraphs(root)).toContain(IN_TEXT);
      expect(buttonTexts(root)).toEqual(['Next', 'Skip the rest']);
    });
  });

  it('C1a shows the tailnet identity, "You\'re in." and the Next and Skip the rest buttons', async () => {
    const doubles = createShellTestDoubles();
    doubles.api.respond(
      'GET',
      IDENTITY_ROUTE,
      SETUP_AUTH_EXAMPLES.identityTailnet,
    );
    doubles.api.respond(
      'GET',
      SETUP_STATUS_ROUTE,
      SETUP_AUTH_EXAMPLES.setupStatus,
    );

    const harness = await renderSetup(doubles.providers);

    await settle(harness, (root) => {
      expect(paragraphs(root)).toContain(TAILNET_TEXT);
      expect(paragraphs(root)).toContain(IN_TEXT);
      expect(buttonTexts(root)).toEqual(['Next', 'Skip the rest']);
    });
  });

  it('C1b Skip the rest posts and navigates to the landing', async () => {
    const doubles = createShellTestDoubles();
    doubles.api.respond(
      'GET',
      IDENTITY_ROUTE,
      SETUP_AUTH_EXAMPLES.identityLoopback,
    );
    doubles.api.respond(
      'GET',
      SETUP_STATUS_ROUTE,
      SETUP_AUTH_EXAMPLES.setupStatus,
    );
    doubles.api.respond('POST', SETUP_CONTINUE_ROUTE, complete);
    respondLanding(doubles);

    const harness = await renderSetup(doubles.providers);
    const router = TestBed.inject(Router);
    await settle(harness, (root) =>
      expect(buttonTexts(root)).toEqual(['Next', 'Skip the rest']),
    );

    buttonNamed(rootOf(harness), 'Skip the rest')?.click();

    expect(doubles.api.requests).toContainEqual({
      method: 'POST',
      path: SETUP_CONTINUE_ROUTE,
      body: {},
    });
    await vi.waitFor(() => expect(router.url).toBe('/projects/a/chat'), {
      timeout: 5000,
    });
  });

  it('C1c a 401 shows the loopback sign-in notice with the command', async () => {
    const doubles = createShellTestDoubles();
    doubles.api.fail(
      'GET',
      IDENTITY_ROUTE,
      new ApiError(401, 'AUTH_REQUIRED', 'Not signed in.'),
    );

    const harness = await renderSetup(doubles.providers);

    await settle(harness, (root) => {
      expect(codeTexts(root)).toEqual(SIGN_IN_COMMANDS);
      expect(buttonTexts(root)).toEqual([]);
      expect(paragraphs(root)).not.toContain(IN_TEXT);
    });
  });

  it('C1d shows the explanation of AUTH_TAILNET_IDENTITY_MISSING, not the server text', async () => {
    const doubles = createShellTestDoubles();
    doubles.api.fail(
      'GET',
      IDENTITY_ROUTE,
      new ApiError(403, 'AUTH_TAILNET_IDENTITY_MISSING', 'server text'),
    );

    const harness = await renderSetup(doubles.providers);

    await settle(harness, (root) => {
      expect(paragraphs(root)).toContain(IDENTITY_MISSING_TEXT);
      expect(root.textContent).not.toContain('server text');
      expect(buttonTexts(root)).toEqual([]);
    });
  });

  it('C1d shows the explanation of AUTH_TAILNET_NOT_ALLOWED, not the server text', async () => {
    const doubles = createShellTestDoubles();
    doubles.api.fail(
      'GET',
      IDENTITY_ROUTE,
      new ApiError(403, 'AUTH_TAILNET_NOT_ALLOWED', 'server text'),
    );

    const harness = await renderSetup(doubles.providers);

    await settle(harness, (root) => {
      expect(paragraphs(root)).toContain(NOT_ALLOWED_TEXT);
      expect(root.textContent).not.toContain('server text');
      expect(buttonTexts(root)).toEqual([]);
    });
  });
});

/**
 * A fake whose POST waits for `answers`. An Error answer fails the call; any other value is
 * the 2xx body.
 */
class HeldPostClient extends FakeApiClient {
  readonly answers = new Subject<unknown>();

  override post<T>(
    path: ApiPath,
    body: unknown,
    schema: ResponseSchema<T>,
  ): Observable<T> {
    this.requests.push({ method: 'POST', path, body });
    return this.answers.pipe(
      take(1),
      mergeMap((answer) =>
        answer instanceof Error
          ? throwError(() => answer)
          : of(parseResponse(path, schema, answer)),
      ),
    );
  }
}

describe('setup page extra tests', () => {
  it('X1 a failed Skip the rest keeps the page, the identity and an enabled button, and shows the message', async () => {
    const doubles = createShellTestDoubles();
    doubles.api.respond(
      'GET',
      IDENTITY_ROUTE,
      SETUP_AUTH_EXAMPLES.identityLoopback,
    );
    doubles.api.respond(
      'GET',
      SETUP_STATUS_ROUTE,
      SETUP_AUTH_EXAMPLES.setupStatus,
    );
    doubles.api.fail(
      'POST',
      SETUP_CONTINUE_ROUTE,
      new ApiError(
        500,
        CLIENT_ERROR_CODES.UNEXPECTED_RESPONSE,
        'The server sent an unexpected response.',
      ),
    );

    const harness = await renderSetup(doubles.providers);
    const router = TestBed.inject(Router);
    await settle(harness, (root) =>
      expect(buttonTexts(root)).toEqual(['Next', 'Skip the rest']),
    );

    buttonNamed(rootOf(harness), 'Skip the rest')?.click();

    await settle(harness, (root) => {
      const alert = root.querySelector('[role="alert"]');
      expect(alert?.textContent.trim()).toBe(
        'The server sent an unexpected response.',
      );
      expect(paragraphs(root)).toContain(LOOPBACK_TEXT);
      expect(buttonNamed(root, 'Skip the rest')?.disabled).toBe(false);
    });
    expect(router.url).toBe('/setup');
  });

  it('X2 an identity read that fails with another code shows its message only', async () => {
    const doubles = createShellTestDoubles();
    doubles.api.fail(
      'GET',
      IDENTITY_ROUTE,
      new ApiError(
        403,
        'AUTH_HOST_REJECTED',
        'The Host header is not allowed.',
      ),
    );

    const harness = await renderSetup(doubles.providers);

    await settle(harness, (root) => {
      const alert = root.querySelector('[role="alert"]');
      expect(alert?.textContent.trim()).toBe('The Host header is not allowed.');
      expect(paragraphs(root)).not.toContain(IDENTITY_MISSING_TEXT);
      expect(paragraphs(root)).not.toContain(NOT_ALLOWED_TEXT);
      expect(buttonTexts(root)).toEqual([]);
    });
  });

  it('X3 the /setup entry is app-scoped, phone-gated, has no nav and loads children', () => {
    const entries = APP_ROUTES.filter(
      (route) => route.path === 'setup' && route.data !== undefined,
    );

    expect(entries).toHaveLength(1);
    const entry = entries[0];
    const data = entry?.data as
      { scope?: unknown; minDeviceClass?: unknown; nav?: unknown } | undefined;
    expect(data?.scope).toBe('app');
    expect(data?.minDeviceClass).toBe('phone');
    expect(data?.nav).toBeUndefined();
    expect(entry?.loadChildren).toBeDefined();
  });

  it('X4 a second Skip the rest before the answer sends no second POST, and an error answer re-enables the button', async () => {
    const doubles = createShellTestDoubles();
    const api = new HeldPostClient();
    api.respond('GET', IDENTITY_ROUTE, SETUP_AUTH_EXAMPLES.identityLoopback);
    api.respond('GET', SETUP_STATUS_ROUTE, SETUP_AUTH_EXAMPLES.setupStatus);

    const harness = await renderSetup([
      ...doubles.providers,
      { provide: API_CLIENT, useValue: api },
    ]);
    await settle(harness, (root) =>
      expect(buttonTexts(root)).toEqual(['Next', 'Skip the rest']),
    );

    const button = buttonNamed(rootOf(harness), 'Skip the rest');
    button?.click();
    button?.click();

    expect(api.requests.filter((r) => r.method === 'POST')).toHaveLength(1);

    api.answers.next(
      new ApiError(
        500,
        CLIENT_ERROR_CODES.UNEXPECTED_RESPONSE,
        'The server sent an unexpected response.',
      ),
    );

    await settle(harness, (root) =>
      expect(buttonNamed(root, 'Skip the rest')?.disabled).toBe(false),
    );
  });
});

describe('W wizard with the fake API', () => {
  const TAILSCALE_STEP_PATH = '/api/setup-auth/steps/tailscale';

  const fresh = {
    steps: {
      access: 'done',
      tailscale: 'pending',
      providers: 'pending',
      preferences: 'pending',
      firstProject: 'pending',
    },
    complete: false,
    compose: SETUP_AUTH_EXAMPLES.composeOk,
  } satisfies SetupStatus;

  const afterSkip = {
    ...fresh,
    steps: { ...fresh.steps, tailscale: 'skipped' },
  } satisfies SetupStatus;

  const continued = {
    steps: {
      access: 'done',
      tailscale: 'skipped',
      providers: 'skipped',
      preferences: 'skipped',
      firstProject: 'skipped',
    },
    complete: true,
    compose: SETUP_AUTH_EXAMPLES.composeOk,
  } satisfies SetupStatus;

  const rerunDone = {
    ...continued,
    steps: { ...continued.steps, tailscale: 'done' },
  } satisfies SetupStatus;

  it('W1 the wizard shows the five steps in order, skips a step, completes, and on re-run shows the stored states and finishes a skipped step', async () => {
    const doubles = createShellTestDoubles();
    doubles.api.respond(
      'GET',
      IDENTITY_ROUTE,
      SETUP_AUTH_EXAMPLES.identityLoopback,
    );
    doubles.api.respond('GET', SETUP_STATUS_ROUTE, fresh);

    const harness = await renderSetup(doubles.providers);
    const router = TestBed.inject(Router);

    await settle(harness, (root) => {
      expect(stepItems(root)).toEqual([
        'Access: done',
        'Tailscale: pending',
        'Model providers: pending',
        'Preferences: pending',
        'First project: pending',
      ]);
      expect(paragraphs(root)).toContain(LOOPBACK_TEXT);
      expect(paragraphs(root)).toContain(IN_TEXT);
      expect(buttonTexts(root)).toEqual(['Next', 'Skip the rest']);
    });

    buttonNamed(rootOf(harness), 'Next')?.click();
    await settle(harness, (root) => {
      expect(paragraphs(root)).toContain('Tailscale is unavailable.');
      expect(buttonTexts(root)).toEqual([
        'Mark done',
        'Skip',
        'Next',
        'Skip the rest',
      ]);
    });
    expect(doubles.api.requests.filter((r) => r.method === 'POST')).toEqual([]);

    doubles.api.respond('POST', TAILSCALE_STEP_PATH, afterSkip);
    buttonNamed(rootOf(harness), 'Skip')?.click();
    await settle(harness, (root) => {
      expect(root.querySelector('app-providers-panel')).not.toBeNull();
      expect(stepItems(root)[1]).toBe('Tailscale: skipped');
    });
    expect(doubles.api.requests).toContainEqual({
      method: 'POST',
      path: TAILSCALE_STEP_PATH,
      body: { state: 'skipped' },
    });

    doubles.api.respond('POST', SETUP_CONTINUE_ROUTE, continued);
    respondLanding(doubles);
    buttonNamed(rootOf(harness), 'Skip the rest')?.click();
    expect(doubles.api.requests).toContainEqual({
      method: 'POST',
      path: SETUP_CONTINUE_ROUTE,
      body: {},
    });
    await vi.waitFor(() => expect(router.url).toBe('/projects/a/chat'), {
      timeout: 5000,
    });

    doubles.api.respond('GET', SETUP_STATUS_ROUTE, continued);
    await harness.navigateByUrl('/setup');
    await settle(harness, (root) => {
      expect(stepItems(root)).toEqual([
        'Access: done',
        'Tailscale: skipped',
        'Model providers: skipped',
        'Preferences: skipped',
        'First project: skipped',
      ]);
      expect(paragraphs(root)).toContain(LOOPBACK_TEXT);
      expect(buttonTexts(root)).toEqual(['Next', 'Skip the rest']);
    });

    doubles.api.respond('POST', TAILSCALE_STEP_PATH, rerunDone);
    buttonNamed(rootOf(harness), 'Next')?.click();
    await settle(harness, (root) =>
      expect(buttonTexts(root)).toEqual([
        'Mark done',
        'Skip',
        'Next',
        'Skip the rest',
      ]),
    );
    buttonNamed(rootOf(harness), 'Mark done')?.click();
    await settle(harness, (root) =>
      expect(stepItems(root)[1]).toBe('Tailscale: done'),
    );
    expect(doubles.api.requests).toContainEqual({
      method: 'POST',
      path: TAILSCALE_STEP_PATH,
      body: { state: 'done' },
    });
  });

  it('W2 the compose warning shows the one-liner for mismatch and unknown, and not for ok', async () => {
    const doubles = createShellTestDoubles();
    doubles.api.respond(
      'GET',
      IDENTITY_ROUTE,
      SETUP_AUTH_EXAMPLES.identityLoopback,
    );

    const setCompose = (compose: unknown): void =>
      doubles.api.respond('GET', SETUP_STATUS_ROUTE, {
        ...SETUP_AUTH_EXAMPLES.setupStatus,
        compose,
      });

    /** Waits for the list, then checks the warning: one for mismatch and unknown, none for ok. */
    const expectWarning = async (
      harness: RouterTestingHarness,
      warned: boolean,
    ): Promise<void> => {
      await settle(harness, (root) => {
        expect(stepItems(root)).toHaveLength(5);
        const warnings = root.querySelectorAll('app-compose-warning');
        if (warned) {
          expect(warnings).toHaveLength(1);
          expect(codeTexts(root)).toEqual([COMPOSE_ONE_LINER]);
        } else {
          expect(warnings).toHaveLength(0);
          expect(codeTexts(root)).toEqual([]);
        }
      });
    };

    setCompose(SETUP_AUTH_EXAMPLES.composeMismatch);
    const harness = await renderSetup(doubles.providers);
    await expectWarning(harness, true);

    setCompose(SETUP_AUTH_EXAMPLES.composeUnknown);
    await harness.navigateByUrl('/no-such-page');
    await harness.navigateByUrl('/setup');
    await expectWarning(harness, true);

    setCompose(SETUP_AUTH_EXAMPLES.composeOk);
    await harness.navigateByUrl('/no-such-page');
    await harness.navigateByUrl('/setup');
    await expectWarning(harness, false);
  });
});

describe('P providers step with the fake API', () => {
  const PROVIDERS_STEP_PATH = '/api/setup-auth/steps/providers';
  const NO_USABLE_TEXT =
    'No usable provider yet. Add a provider and choose it as the app default, or skip this step.';

  const pending = {
    steps: {
      access: 'done',
      tailscale: 'pending',
      providers: 'pending',
      preferences: 'pending',
      firstProject: 'pending',
    },
    complete: false,
    compose: SETUP_AUTH_EXAMPLES.composeOk,
  } satisfies SetupStatus;

  const providersDone = {
    ...pending,
    steps: { ...pending.steps, providers: 'done' },
  } satisfies SetupStatus;

  const providersSkipped = {
    ...pending,
    steps: { ...pending.steps, providers: 'skipped' },
  } satisfies SetupStatus;

  /** Renders `/setup` and moves from Access to the providers step with Next twice. */
  async function reachProviders(
    doubles: ShellTestDoubles,
  ): Promise<RouterTestingHarness> {
    doubles.api.respond(
      'GET',
      IDENTITY_ROUTE,
      SETUP_AUTH_EXAMPLES.identityLoopback,
    );
    doubles.api.respond('GET', SETUP_STATUS_ROUTE, pending);

    const harness = await renderSetup(doubles.providers);
    await settle(harness, (root) =>
      expect(buttonTexts(root)).toEqual(['Next', 'Skip the rest']),
    );
    buttonNamed(rootOf(harness), 'Next')?.click();
    await settle(harness, (root) =>
      expect(buttonTexts(root)).toEqual([
        'Mark done',
        'Skip',
        'Next',
        'Skip the rest',
      ]),
    );
    buttonNamed(rootOf(harness), 'Next')?.click();
    await settle(harness, (root) =>
      expect(buttonTexts(root)).toEqual([
        'Continue',
        'Skip',
        'Next',
        'Skip the rest',
      ]),
    );
    return harness;
  }

  /**
   * Clicks Continue, waits for the message, and checks that the only requests after the click are
   * the two reads, and that the step is still providers with Continue enabled.
   */
  async function continueShowsMessage(
    doubles: ShellTestDoubles,
    harness: RouterTestingHarness,
  ): Promise<void> {
    const before = doubles.api.requests.length;
    buttonNamed(rootOf(harness), 'Continue')?.click();

    await settle(harness, (root) => {
      expect(root.querySelector('[role="alert"]')?.textContent.trim()).toBe(
        NO_USABLE_TEXT,
      );
      expect(root.querySelector('app-providers-panel')).not.toBeNull();
      expect(buttonNamed(root, 'Continue')?.disabled).toBe(false);
      expect(stepItems(root)[2]).toBe('Model providers: pending');
    });
    expect(doubles.api.requests.slice(before)).toEqual([
      { method: 'GET', path: PROVIDERS_ROUTE },
      { method: 'GET', path: APP_DEFAULT_ROUTE },
    ]);
  }

  it('P3 the providers step shows Continue, Skip, Next and Skip the rest, and no Mark done', async () => {
    const doubles = createShellTestDoubles();

    const harness = await reachProviders(doubles);

    expect(buttonTexts(rootOf(harness))).toEqual([
      'Continue',
      'Skip',
      'Next',
      'Skip the rest',
    ]);
  });

  it('P4 Continue with a usable provider reads the list and the app default, writes done and moves on', async () => {
    const doubles = createShellTestDoubles();
    doubles.api.respond(
      'GET',
      PROVIDERS_ROUTE,
      PROVIDERS_EXAMPLES.providerList,
    );
    doubles.api.respond(
      'GET',
      APP_DEFAULT_ROUTE,
      PROVIDERS_EXAMPLES.appDefault,
    );
    doubles.api.respond('POST', PROVIDERS_STEP_PATH, providersDone);
    const harness = await reachProviders(doubles);
    const before = doubles.api.requests.length;

    buttonNamed(rootOf(harness), 'Continue')?.click();

    await settle(harness, (root) => {
      expect(paragraphs(root)).toContain('Preferences are not set up yet.');
      expect(stepItems(root)[2]).toBe('Model providers: done');
    });
    expect(doubles.api.requests.slice(before)).toEqual([
      { method: 'GET', path: PROVIDERS_ROUTE },
      { method: 'GET', path: APP_DEFAULT_ROUTE },
      { method: 'POST', path: PROVIDERS_STEP_PATH, body: { state: 'done' } },
    ]);
  });

  it('P5 Continue without an app default writes nothing and shows the message', async () => {
    const doubles = createShellTestDoubles();
    doubles.api.respond(
      'GET',
      PROVIDERS_ROUTE,
      PROVIDERS_EXAMPLES.providerList,
    );
    doubles.api.respond(
      'GET',
      APP_DEFAULT_ROUTE,
      PROVIDERS_EXAMPLES.appDefaultUnset,
    );
    const harness = await reachProviders(doubles);

    await continueShowsMessage(doubles, harness);
  });

  it('P6 Skip on the providers step writes skipped and moves on', async () => {
    const doubles = createShellTestDoubles();
    doubles.api.respond('POST', PROVIDERS_STEP_PATH, providersSkipped);
    const harness = await reachProviders(doubles);
    const before = doubles.api.requests.length;

    buttonNamed(rootOf(harness), 'Skip')?.click();

    await settle(harness, (root) => {
      expect(paragraphs(root)).toContain('Preferences are not set up yet.');
      expect(stepItems(root)[2]).toBe('Model providers: skipped');
    });
    expect(doubles.api.requests.slice(before)).toEqual([
      { method: 'POST', path: PROVIDERS_STEP_PATH, body: { state: 'skipped' } },
    ]);
    expect(
      doubles.api.requests.filter((request) =>
        request.path.startsWith('/api/providers'),
      ),
    ).toEqual([]);
  });

  it('P8 Continue when the app default names no listed provider writes nothing and shows the message', async () => {
    const doubles = createShellTestDoubles();
    doubles.api.respond('GET', PROVIDERS_ROUTE, { providers: [] });
    doubles.api.respond(
      'GET',
      APP_DEFAULT_ROUTE,
      PROVIDERS_EXAMPLES.appDefault,
    );
    const harness = await reachProviders(doubles);

    await continueShowsMessage(doubles, harness);
  });
});
