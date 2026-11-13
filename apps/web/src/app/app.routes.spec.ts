import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { APP_ROUTES } from './app.routes';

describe('APP_ROUTES', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter(APP_ROUTES)] });
  });

  it('renders the not-found page for an unknown path', async () => {
    const harness = await RouterTestingHarness.create('/no-such-page');

    expect(harness.routeNativeElement?.textContent).toContain('Page not found');
  });

  it('renders the not-found page for an unknown project sub-path', async () => {
    const harness = await RouterTestingHarness.create('/projects/p1/no-such');

    expect(harness.routeNativeElement?.textContent).toContain('Page not found');
  });

  it('renders the landing placeholder at the root', async () => {
    const harness = await RouterTestingHarness.create('/');

    expect(harness.routeNativeElement?.textContent).toContain(
      'Scriba is running.',
    );
  });
});
