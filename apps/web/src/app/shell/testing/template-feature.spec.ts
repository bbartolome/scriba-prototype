import { TestBed } from '@angular/core/testing';
import { provideRouter, type Route } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import {
  VERSION_ROUTE,
  type VersionInfo,
} from '@bbartolome/scriba-contracts/platform';
import { describe, expect, it } from 'vitest';
import type { ShellRouteData } from '../route-data';
import { API_CLIENT } from '../tokens';
import { createShellTestDoubles, type ShellTestDoubles } from './test-doubles';

// The entry a feature copies: a lazy route at its owned path. The spec registers it, so it never
// reaches APP_ROUTES.
const templateEntry: Route = {
  path: 'template',
  pathMatch: 'full',
  data: {
    scope: 'app',
    nav: { label: 'Template', icon: 'description', order: 90 },
  } satisfies ShellRouteData,
  loadChildren: () =>
    import('./template-feature').then((feature) => feature.templateRoutes),
};

async function renderTemplate(
  doubles: ShellTestDoubles,
): Promise<RouterTestingHarness> {
  TestBed.configureTestingModule({
    providers: [provideRouter([templateEntry]), ...doubles.providers],
  });
  return RouterTestingHarness.create('/template');
}

describe('template feature route', () => {
  it('T1 renders a value from a fake response, with the fake client injected', async () => {
    const doubles = createShellTestDoubles();
    doubles.api.respond('GET', VERSION_ROUTE, {
      version: '1.2.3',
      revision: 'abc1234',
      builtAt: '2026-11-13T00:00:00Z',
      composeVersion: 1,
    } satisfies VersionInfo);

    const harness = await renderTemplate(doubles);

    expect(harness.routeNativeElement?.textContent).toContain(
      'Platform version: 1.2.3',
    );
    expect(TestBed.inject(API_CLIENT)).toBe(doubles.api);
  });

  it('T2 updates live from a fake envelope, with no second request', async () => {
    const doubles = createShellTestDoubles();
    doubles.api.respond('GET', VERSION_ROUTE, {
      version: '1.2.3',
      revision: 'abc1234',
      builtAt: '2026-11-13T00:00:00Z',
      composeVersion: 1,
    } satisfies VersionInfo);
    const harness = await renderTemplate(doubles);

    doubles.events.push({
      module: 'platform',
      type: 'echo',
      data: { seq: 4, sentAt: '2026-11-13T00:00:04.000Z' },
    });
    harness.detectChanges();

    expect(harness.routeNativeElement?.textContent).toContain('Latest echo: 4');
    expect(doubles.api.requests).toEqual([
      { method: 'GET', path: VERSION_ROUTE },
    ]);
  });
});
