import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './app';
import { APP_ROUTES } from './app.routes';
import { restoreMatchMedia, stubMatchMedia } from './shell/testing/match-media';
import {
  createShellTestDoubles,
  type ShellTestDoubles,
} from './shell/testing/test-doubles';

let doubles: ShellTestDoubles;

beforeEach(() => {
  stubMatchMedia(390, 844);
  doubles = createShellTestDoubles();
});

afterEach(() => {
  restoreMatchMedia();
});

describe('Core gate', () => {
  it('C2 shows the Core gate nav item with its label and icon on a phone, and its URL opens its page', async () => {
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
    const nav = root.querySelector('nav[aria-label="Bottom navigation"]');
    expect(nav).not.toBeNull();
    const link = [...(nav?.querySelectorAll('a') ?? [])].find(
      (anchor) =>
        anchor.querySelector('span')?.textContent?.trim() === 'Core gate',
    );
    expect(link).toBeDefined();
    expect(link?.querySelector('mat-icon')?.textContent?.trim()).toBe(
      'science',
    );

    link?.click();
    await vi.waitFor(() => expect(router.url).toBe('/core-gate'), {
      timeout: 5000,
    });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(root.querySelector('h2')?.textContent?.trim()).toBe('Core gate');
  });
});
