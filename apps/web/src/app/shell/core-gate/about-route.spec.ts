import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import {
  HEALTHZ_ROUTE,
  VERSION_ROUTE,
  type Healthz,
  type VersionInfo,
} from '@bbartolome/scriba-contracts/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { APP_ROUTES } from '../../app.routes';
import { restoreMatchMedia, stubMatchMedia } from '../testing/match-media';
import { createShellTestDoubles } from '../testing/test-doubles';

const version = {
  version: '1.2.3',
  revision: 'abc1234',
  builtAt: '2026-11-14T00:00:00Z',
  composeVersion: 1,
} satisfies VersionInfo;

const healthy = { status: 'ok', version: '1.2.3' } satisfies Healthz;

/**
 * The core-gate page is a lazy chunk, which `whenStable()` does not track. A cold load can pass the
 * 1000 ms default of `vi.waitFor` on a busy machine, so the wait gives it more.
 */
const LOAD_WAIT = { timeout: 5000 };

beforeEach(() => {
  stubMatchMedia(1280, 800);
});

afterEach(() => {
  restoreMatchMedia();
});

/** The text of the `dd` after the `dt` with the given label, trimmed. */
function valueOf(root: HTMLElement, label: string): string | undefined {
  const term = [...root.querySelectorAll('dt')].find(
    (dt) => dt.textContent?.trim() === label,
  );
  return term?.nextElementSibling?.textContent?.trim();
}

describe('about route', () => {
  it('criterion 1: The about panel shows version, revision and health.', async () => {
    const doubles = createShellTestDoubles();
    doubles.api.respond('GET', VERSION_ROUTE, version);
    doubles.api.respond('GET', HEALTHZ_ROUTE, healthy);
    TestBed.configureTestingModule({
      providers: [provideRouter(APP_ROUTES), ...doubles.providers],
    });

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/core-gate');

    await vi.waitFor(() => {
      harness.detectChanges();
      expect(
        harness.routeNativeElement?.querySelector('app-about-panel'),
      ).not.toBeNull();
    }, LOAD_WAIT);
    const root = harness.routeNativeElement?.querySelector(
      'app-about-panel',
    ) as HTMLElement;

    expect(valueOf(root, 'Version')).toBe('1.2.3');
    expect(valueOf(root, 'Revision')).toBe('abc1234');
    expect(valueOf(root, 'Health')).toBe('ok');
    expect(root.querySelector('[role="status"]')).toBeNull();
    expect(root.querySelector('[role="alert"]')).toBeNull();
  }, 20000);
});
