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
  SETUP_STATUS_ROUTE,
  type SetupStatus,
} from '@bbartolome/scriba-contracts/setup-auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { APP_ROUTES } from '../app.routes';
import { ApiError, CLIENT_ERROR_CODES } from './api-error';
import {
  createShellTestDoubles,
  type ShellTestDoubles,
} from './testing/test-doubles';

const version = {
  version: '1.2.3',
  revision: 'abc1234',
  builtAt: '2026-11-14T00:00:00Z',
  composeVersion: 1,
} satisfies VersionInfo;

const healthy = { status: 'ok', version: '1.2.3' } satisfies Healthz;

const incomplete = {
  steps: {
    access: 'pending',
    tailscale: 'pending',
    providers: 'pending',
    preferences: 'pending',
    firstProject: 'pending',
  },
  complete: false,
  compose: { state: 'ok', expected: 1, actual: 1 },
} satisfies SetupStatus;

const complete = { ...incomplete, complete: true } satisfies SetupStatus;

let doubles: ShellTestDoubles;

beforeEach(() => {
  doubles = createShellTestDoubles();
  doubles.api.respond('GET', VERSION_ROUTE, version);
  doubles.api.respond('GET', HEALTHZ_ROUTE, healthy);
  TestBed.configureTestingModule({
    providers: [provideRouter(APP_ROUTES), ...doubles.providers],
  });
});

function activeReads(): number {
  return doubles.api.requests.filter((r) => r.path === ACTIVE_PROJECT_ROUTE)
    .length;
}

describe('landing', () => {
  it('C1 routes by setup status and active project', async () => {
    doubles.api.respond('GET', SETUP_STATUS_ROUTE, incomplete);
    await RouterTestingHarness.create('/');
    const router = TestBed.inject(Router);

    await vi.waitFor(() => expect(router.url).toBe('/setup'));
    expect(activeReads()).toBe(0);

    doubles.api.respond('GET', SETUP_STATUS_ROUTE, complete);
    doubles.api.respond('GET', ACTIVE_PROJECT_ROUTE, { active: 'a' });
    await router.navigateByUrl('/');
    await vi.waitFor(() => expect(router.url).toBe('/projects/a/chat'));
    expect(activeReads()).toBeGreaterThan(0);

    doubles.api.respond('GET', ACTIVE_PROJECT_ROUTE, { active: null });
    await router.navigateByUrl('/');
    await vi.waitFor(() => expect(router.url).toBe('/projects'));
  });

  it('E1 keeps the version and health when the status read fails', async () => {
    doubles.api.fail(
      'GET',
      SETUP_STATUS_ROUTE,
      new ApiError(
        0,
        CLIENT_ERROR_CODES.NETWORK,
        'Could not reach the server.',
      ),
    );
    const harness = await RouterTestingHarness.create('/');

    await vi.waitFor(() => {
      harness.detectChanges();
      const text = harness.routeNativeElement?.textContent ?? '';
      expect(text).toContain('Platform version: 1.2.3');
      expect(text).toContain('Health: ok');
      const alert = harness.routeNativeElement?.querySelector('[role="alert"]');
      expect(alert?.textContent).toContain('Could not reach the server.');
    });
    expect(TestBed.inject(Router).url).toBe('/');
  });
});
