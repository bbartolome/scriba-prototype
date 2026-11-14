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
  IDENTITY_ROUTE,
  SETUP_AUTH_EXAMPLES,
  SETUP_CONTINUE_ROUTE,
  SETUP_STATUS_ROUTE,
  type SetupStatus,
} from '@bbartolome/scriba-contracts/setup-auth';
import { Observable, Subject, of, throwError, take, mergeMap } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { APP_ROUTES } from '../../app.routes';
import { parseResponse, type ApiPath, type ResponseSchema } from '../../shell/api-client';
import { ApiError, CLIENT_ERROR_CODES } from '../../shell/api-error';
import { restoreMatchMedia, stubMatchMedia } from '../../shell/testing/match-media';
import {
  createShellTestDoubles,
  FakeApiClient,
  type ShellTestDoubles,
} from '../../shell/testing/test-doubles';
import { API_CLIENT } from '../../shell/tokens';

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

/** Renders `/setup` with the given doubles. */
async function renderSetup(
  providers: ShellTestDoubles['providers'],
): Promise<RouterTestingHarness> {
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

function codeTexts(root: HTMLElement): string[] {
  return [...root.querySelectorAll('code')].map((c) => c.textContent.trim());
}

function continueButton(root: HTMLElement): HTMLButtonElement | null {
  return root.querySelector('button');
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

/** Reads of the landing, which Continue navigates to. */
function respondLanding(doubles: ShellTestDoubles): void {
  doubles.api.respond('GET', VERSION_ROUTE, version);
  doubles.api.respond('GET', HEALTHZ_ROUTE, healthy);
  doubles.api.respond('GET', SETUP_STATUS_ROUTE, complete);
  doubles.api.respond('GET', ACTIVE_PROJECT_ROUTE, { active: 'a' });
}

describe('C1 setup page with the fake API', () => {
  it('C1a shows the loopback identity, "You\'re in." and Continue', async () => {
    const doubles = createShellTestDoubles();
    doubles.api.respond(
      'GET',
      IDENTITY_ROUTE,
      SETUP_AUTH_EXAMPLES.identityLoopback,
    );

    const harness = await renderSetup(doubles.providers);

    await settle(harness, (root) => {
      expect(paragraphs(root)).toContain(LOOPBACK_TEXT);
      expect(paragraphs(root)).toContain(IN_TEXT);
      expect(buttonTexts(root)).toEqual(['Continue']);
    });
  });

  it('C1a shows the tailnet identity, "You\'re in." and Continue', async () => {
    const doubles = createShellTestDoubles();
    doubles.api.respond(
      'GET',
      IDENTITY_ROUTE,
      SETUP_AUTH_EXAMPLES.identityTailnet,
    );

    const harness = await renderSetup(doubles.providers);

    await settle(harness, (root) => {
      expect(paragraphs(root)).toContain(TAILNET_TEXT);
      expect(paragraphs(root)).toContain(IN_TEXT);
      expect(buttonTexts(root)).toEqual(['Continue']);
    });
  });

  it('C1b Continue posts and navigates to the landing', async () => {
    const doubles = createShellTestDoubles();
    doubles.api.respond(
      'GET',
      IDENTITY_ROUTE,
      SETUP_AUTH_EXAMPLES.identityLoopback,
    );
    doubles.api.respond('POST', SETUP_CONTINUE_ROUTE, complete);
    respondLanding(doubles);

    const harness = await renderSetup(doubles.providers);
    const router = TestBed.inject(Router);
    await settle(harness, (root) =>
      expect(buttonTexts(root)).toEqual(['Continue']),
    );

    continueButton(rootOf(harness))?.click();

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
  it('X1 a failed Continue keeps the page, the identity and an enabled button, and shows the message', async () => {
    const doubles = createShellTestDoubles();
    doubles.api.respond(
      'GET',
      IDENTITY_ROUTE,
      SETUP_AUTH_EXAMPLES.identityLoopback,
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
      expect(buttonTexts(root)).toEqual(['Continue']),
    );

    continueButton(rootOf(harness))?.click();

    await settle(harness, (root) => {
      const alert = root.querySelector('[role="alert"]');
      expect(alert?.textContent.trim()).toBe(
        'The server sent an unexpected response.',
      );
      expect(paragraphs(root)).toContain(LOOPBACK_TEXT);
      expect(continueButton(root)?.disabled).toBe(false);
    });
    expect(router.url).toBe('/setup');
  });

  it('X2 an identity read that fails with another code shows its message only', async () => {
    const doubles = createShellTestDoubles();
    doubles.api.fail(
      'GET',
      IDENTITY_ROUTE,
      new ApiError(403, 'AUTH_HOST_REJECTED', 'The Host header is not allowed.'),
    );

    const harness = await renderSetup(doubles.providers);

    await settle(harness, (root) => {
      const alert = root.querySelector('[role="alert"]');
      expect(alert?.textContent.trim()).toBe(
        'The Host header is not allowed.',
      );
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
      | { scope?: unknown; minDeviceClass?: unknown; nav?: unknown }
      | undefined;
    expect(data?.scope).toBe('app');
    expect(data?.minDeviceClass).toBe('phone');
    expect(data?.nav).toBeUndefined();
    expect(entry?.loadChildren).toBeDefined();
  });

  it('X4 a second Continue before the answer sends no second POST, and an error answer re-enables the button', async () => {
    const doubles = createShellTestDoubles();
    const api = new HeldPostClient();
    api.respond('GET', IDENTITY_ROUTE, SETUP_AUTH_EXAMPLES.identityLoopback);

    const harness = await renderSetup([
      ...doubles.providers,
      { provide: API_CLIENT, useValue: api },
    ]);
    await settle(harness, (root) =>
      expect(buttonTexts(root)).toEqual(['Continue']),
    );

    const button = continueButton(rootOf(harness));
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
      expect(continueButton(root)?.disabled).toBe(false),
    );
  });
});
