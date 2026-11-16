import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import {
  PROVIDER_DEFAULTS,
  type ProviderConfig,
} from '@bbartolome/scriba-contracts/providers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../app';
import { APP_ROUTES } from '../../app.routes';
import {
  restoreMatchMedia,
  stubMatchMedia,
} from '../../shell/testing/match-media';
import {
  createShellTestDoubles,
  type ShellTestDoubles,
} from '../../shell/testing/test-doubles';
import { installProvidersServer, readView } from './providers-test-server';

// The /providers route: its table entry (R1), its nav item and its page at phone and larger widths
// (R2), and the panel that the page hosts at phone width (R3).

let resize: (width: number, height: number) => void;

beforeEach(() => {
  resize = stubMatchMedia(390, 844);
});

afterEach(() => {
  restoreMatchMedia();
});

function providerConfig(id: string, baseURL: string): ProviderConfig {
  return {
    id,
    kind: 'openai-compatible',
    baseURL,
    model: '',
    ...PROVIDER_DEFAULTS,
  };
}

/** The Providers link of the bottom nav, found by its label. */
function providersLink(root: HTMLElement): HTMLAnchorElement | undefined {
  return [
    ...root.querySelectorAll<HTMLAnchorElement>('a[href="/providers"]'),
  ].find(
    (anchor) =>
      anchor.querySelector('span')?.textContent?.trim() === 'Providers',
  );
}

/** Lets a resize reach the CDK's debounced change, then renders it. */
async function settle<T>(fixture: ComponentFixture<T>): Promise<void> {
  await new Promise((done) => setTimeout(done, 10));
  fixture.detectChanges();
  await fixture.whenStable();
}

describe('/providers route', () => {
  it('R1 the /providers entry is app-scoped, phone-gated, has the nav entry, loads children and holds no component', () => {
    const entries = APP_ROUTES.filter(
      (route) => route.path === 'providers' && route.data !== undefined,
    );

    expect(entries).toHaveLength(1);
    const entry = entries[0];
    expect(entry?.data).toEqual({
      scope: 'app',
      minDeviceClass: 'phone',
      nav: { label: 'Providers', icon: 'tune', order: 50 },
    });
    expect(entry?.loadChildren).toBeDefined();
    expect(entry?.component).toBeUndefined();
    expect(entry?.loadComponent).toBeUndefined();
  });

  it('R2 the Providers item shows at 390 by 844 and at 1280 by 800, and clicking it opens the page', async () => {
    const doubles: ShellTestDoubles = createShellTestDoubles();
    installProvidersServer(doubles.api, {
      providers: [],
      presets: [],
      appDefault: null,
    });
    doubles.api.respond('GET', '/api/project-store/active', { active: null });
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(APP_ROUTES), ...doubles.providers],
    });
    await TestBed.compileComponents();
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    fixture.detectChanges();
    await fixture.whenStable();

    const root = fixture.nativeElement as HTMLElement;
    const link = providersLink(root);
    expect(link?.closest('nav')?.getAttribute('aria-label')).toBe(
      'Bottom navigation',
    );
    expect(link?.querySelector('mat-icon')?.textContent?.trim()).toBe('tune');

    link?.click();
    await vi.waitFor(() => expect(router.url).toBe('/providers'), {
      timeout: 5000,
    });
    await vi.waitFor(
      () => {
        fixture.detectChanges();
        expect(root.querySelector('h2')?.textContent?.trim()).toBe(
          'Model providers',
        );
      },
      { timeout: 5000 },
    );

    resize(1280, 800);
    await settle(fixture);
    expect(providersLink(root)).toBeDefined();
  }, 10000);

  it('R3 at 390 by 844 the page hosts the panel: its title, the App default select with the stored default, and a choice posts it', async () => {
    const doubles = createShellTestDoubles();
    const first = readView(
      providerConfig('first-llama', 'http://localhost:9001/v1'),
    );
    const second = readView(
      providerConfig('second-llama', 'http://localhost:9002/v1'),
    );
    installProvidersServer(doubles.api, {
      providers: [first, second],
      presets: [],
      appDefault: { providerId: first.id, model: '' },
    });
    doubles.api.respond('GET', '/api/project-store/active', { active: null });
    doubles.api.respond('POST', '/api/providers/app-default', {
      appDefault: { providerId: second.id, model: '' },
    });
    TestBed.configureTestingModule({
      providers: [provideRouter(APP_ROUTES), ...doubles.providers],
    });
    const harness = await RouterTestingHarness.create('/providers');
    const pageOf = (): HTMLElement => {
      const page = harness.routeNativeElement;
      if (!page) throw new Error('The providers page is not rendered.');
      return page;
    };
    const appDefaultOf = (): HTMLSelectElement => {
      const select = pageOf().querySelector<HTMLSelectElement>(
        'select[name="appDefault"]',
      );
      if (!select) throw new Error('No App default select.');
      return select;
    };
    const posts = (): unknown[] =>
      doubles.api.requests.filter(
        (request) =>
          request.method === 'POST' &&
          request.path === '/api/providers/app-default',
      );

    await vi.waitFor(
      () => {
        harness.detectChanges();
        expect(
          pageOf().querySelector('select[name="appDefault"]'),
        ).not.toBeNull();
      },
      { timeout: 5000 },
    );
    expect(pageOf().querySelector('h2')?.textContent?.trim()).toBe(
      'Model providers',
    );
    expect(pageOf().querySelectorAll('select')).toHaveLength(1);
    expect(appDefaultOf().value).toBe(first.id);

    appDefaultOf().value = second.id;
    appDefaultOf().dispatchEvent(new Event('change'));
    await vi.waitFor(() => expect(posts()).toHaveLength(1), {
      timeout: 5000,
    });
    expect(posts()).toEqual([
      {
        method: 'POST',
        path: '/api/providers/app-default',
        body: { providerId: second.id, model: '' },
      },
    ]);
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(appDefaultOf().value).toBe(second.id);
  }, 10000);
});
