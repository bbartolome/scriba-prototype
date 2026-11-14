import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ACTIVE_PROJECT_ROUTE } from '@bbartolome/scriba-contracts/project-store';
import { beforeEach, describe, expect, it } from 'vitest';
import { APP_ROUTES } from './app.routes';
import {
  createShellTestDoubles,
  type ShellTestDoubles,
} from './shell/testing/test-doubles';

describe('APP_ROUTES', () => {
  let doubles: ShellTestDoubles;

  beforeEach(() => {
    doubles = createShellTestDoubles();
    TestBed.configureTestingModule({
      providers: [provideRouter(APP_ROUTES), ...doubles.providers],
    });
  });

  it('renders the not-found page for an unknown path', async () => {
    const harness = await RouterTestingHarness.create('/no-such-page');

    expect(harness.routeNativeElement?.textContent).toContain('Page not found');
  });

  it('renders the not-found page for an unknown project sub-path', async () => {
    doubles.api.respond('GET', ACTIVE_PROJECT_ROUTE, { active: 'p1' });
    const harness = await RouterTestingHarness.create('/projects/p1/no-such');

    expect(harness.routeNativeElement?.textContent).toContain('Page not found');
  });
});
