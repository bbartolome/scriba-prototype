import { Component, type Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../app';
import { APP_ROUTES } from '../app.routes';
import { AppNav } from './app-nav';
import { withDeviceGate } from './device-class';
import { SseClient } from './sse-client';
import { restoreMatchMedia, stubMatchMedia } from './testing/match-media';
import { FakeApiClient } from './testing/test-doubles';
import { API_CLIENT, SSE_CLIENT } from './tokens';

@Component({ template: '<p>probe phone view</p>' })
class PhoneView {}

@Component({ template: '<p>probe tablet view</p>' })
class TabletView {}

@Component({ template: '<p>probe plain view</p>' })
class PlainView {}

@Component({ template: '<p>probe chat</p>' })
class ChatView {}

const probes = withDeviceGate([
  {
    path: 'phone-view',
    data: {
      scope: 'app',
      minDeviceClass: 'phone',
      nav: { label: 'Phone view', icon: 'smartphone', order: 1 },
    },
    component: PhoneView,
  },
  {
    path: 'tablet-view',
    data: {
      scope: 'app',
      minDeviceClass: 'tablet',
      nav: { label: 'Tablet view', icon: 'tablet', order: 2 },
    },
    component: TabletView,
  },
  {
    path: 'plain-view',
    data: {
      scope: 'app',
      nav: { label: 'Plain view', icon: 'article', order: 3 },
    },
    component: PlainView,
  },
  {
    path: 'projects/:projectId',
    children: [
      {
        path: 'chat',
        data: {
          scope: 'project',
          nav: { label: 'Chat', icon: 'chat', order: 1 },
        },
        component: ChatView,
      },
    ],
  },
]);

/** Sizes used by the form tests, as [width, height]. */
const SIZES: ReadonlyArray<readonly [number, number]> = [
  [390, 844],
  [820, 1180],
  [1280, 800],
];

let resize: (width: number, height: number) => void;

beforeEach(() => {
  resize = stubMatchMedia(390, 844);
});

afterEach(() => {
  restoreMatchMedia();
});

async function render<T>(type: Type<T>): Promise<ComponentFixture<T>> {
  TestBed.configureTestingModule({
    imports: [type],
    providers: [
      { provide: SSE_CLIENT, useClass: SseClient },
      { provide: API_CLIENT, useValue: new FakeApiClient() },
      provideRouter([...probes, ...APP_ROUTES]),
    ],
  });
  await TestBed.compileComponents();
  const fixture = TestBed.createComponent(type);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

/** Waits for the CDK's debounced change, then renders it. */
async function settle<T>(fixture: ComponentFixture<T>): Promise<void> {
  await new Promise((done) => setTimeout(done, 10));
  fixture.detectChanges();
  await fixture.whenStable();
}

function rootOf<T>(fixture: ComponentFixture<T>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function navOf<T>(fixture: ComponentFixture<T>): HTMLElement {
  const nav = rootOf(fixture).querySelector('nav');
  if (!nav) throw new Error('no nav');
  return nav;
}

function hrefsOf<T>(fixture: ComponentFixture<T>): string[] {
  return [...rootOf(fixture).querySelectorAll('nav a')].map(
    (link) => link.getAttribute('href') ?? '',
  );
}

@Component({
  imports: [AppNav],
  template: `<app-nav><p nav-project>slot widget</p></app-nav>`,
})
class SlotHost {}

@Component({
  imports: [AppNav],
  template: `<app-nav />`,
})
class EmptySlotHost {}

describe('app nav', () => {
  it('N1 shows the bottom nav on a portrait phone', async () => {
    const fixture = await render(App);

    expect(navOf(fixture).getAttribute('aria-label')).toBe('Bottom navigation');
  });

  it('N2 shows the bottom nav on a landscape phone', async () => {
    resize(844, 390);
    const fixture = await render(App);

    expect(navOf(fixture).getAttribute('aria-label')).toBe('Bottom navigation');
  });

  it('N3 shows the rail on a tablet', async () => {
    resize(820, 1180);
    const fixture = await render(App);

    expect(navOf(fixture).getAttribute('aria-label')).toBe('Navigation rail');
  });

  it('N4 shows the side nav on a desktop', async () => {
    resize(1280, 800);
    const fixture = await render(App);

    expect(navOf(fixture).getAttribute('aria-label')).toBe('Side navigation');
  });

  it('N5 shows the side nav on a 12.9-inch iPad in portrait', async () => {
    resize(1024, 1366);
    const fixture = await render(App);

    expect(navOf(fixture).getAttribute('aria-label')).toBe('Side navigation');
  });

  it('N6 hides a tablet item on a phone, and shows it on a tablet', async () => {
    const fixture = await render(App);

    expect(hrefsOf(fixture)).toContain('/phone-view');
    expect(hrefsOf(fixture)).not.toContain('/tablet-view');
    expect(hrefsOf(fixture)).not.toContain('/plain-view');

    resize(820, 1180);
    await settle(fixture);

    expect(hrefsOf(fixture)).toContain('/tablet-view');
    expect(hrefsOf(fixture)).toContain('/plain-view');
  });

  it('N7 shows a project item only while a project is open', async () => {
    resize(820, 1180);
    const fixture = await render(App);
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/projects/p1/chat');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(hrefsOf(fixture)).toContain('/projects/p1/chat');

    await router.navigateByUrl('/plain-view');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(hrefsOf(fixture).some((href) => href.startsWith('/projects/'))).toBe(
      false,
    );
  });

  it('N8 renders projected content inside the nav at every size', async () => {
    const fixture = await render(SlotHost);

    for (const [width, height] of SIZES) {
      resize(width, height);
      await settle(fixture);
      expect(navOf(fixture).textContent).toContain('slot widget');
    }
  });

  it('N9 renders no slot element when nothing is projected', async () => {
    const fixture = await render(EmptySlotHost);

    for (const [width, height] of SIZES) {
      resize(width, height);
      await settle(fixture);
      const nav = navOf(fixture);
      expect(nav.children.length).toBe(1);
      expect(nav.children[0]?.classList.contains('items')).toBe(true);
      expect(rootOf(fixture).querySelector('[nav-project]')).toBeNull();
    }
  });

  it('N10 moves between the nav entries with Alt+[ and Alt+], wrapping, and focuses the entry it opens', async () => {
    resize(1280, 800);
    const fixture = await renderProbeNav();
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/plain-view');
    await settle(fixture);

    press(document, { code: 'BracketRight', altKey: true });
    await vi.waitFor(() => expect(router.url).toBe('/phone-view'));
    await settle(fixture);
    expect(document.activeElement?.getAttribute('href')).toBe('/phone-view');

    // The first entry wraps back to the last one.
    press(document, { code: 'BracketLeft', altKey: true });
    await vi.waitFor(() => expect(router.url).toBe('/plain-view'));
  });

  it('N11 does not act from a field, an editable area, or with another modifier', async () => {
    resize(1280, 800);
    const fixture = await renderProbeNav();
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/plain-view');
    await settle(fixture);

    const field = document.createElement('textarea');
    const editable = document.createElement('div');
    editable.setAttribute('contenteditable', 'true');
    fixture.nativeElement.append(field, editable);
    for (const target of [field, editable]) {
      const event = press(target, { code: 'BracketRight', altKey: true });
      expect(event.defaultPrevented).toBe(false);
    }

    const others: KeyboardEventInit[] = [
      { code: 'BracketRight' },
      { code: 'BracketRight', altKey: true, ctrlKey: true },
      { code: 'BracketRight', altKey: true, metaKey: true },
      { code: 'BracketRight', altKey: true, shiftKey: true },
    ];
    for (const init of others) {
      const event = press(document, init);
      expect(event.defaultPrevented).toBe(false);
    }

    await settle(fixture);
    expect(router.url).toBe('/plain-view');
  });
});

/** Dispatches a cancelable keydown and returns it, so the test can read `defaultPrevented`. */
function press(target: EventTarget, init: KeyboardEventInit): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    ...init,
  });
  target.dispatchEvent(event);
  return event;
}

@Component({
  imports: [AppNav],
  template: `<app-nav />`,
})
class NavHost {}

/** Renders the nav with the probe routes only, so its entries are the three probes at desktop. */
async function renderProbeNav(): Promise<ComponentFixture<NavHost>> {
  TestBed.configureTestingModule({
    imports: [NavHost],
    providers: [
      { provide: SSE_CLIENT, useClass: SseClient },
      { provide: API_CLIENT, useValue: new FakeApiClient() },
      provideRouter(probes),
    ],
  });
  await TestBed.compileComponents();
  const fixture = TestBed.createComponent(NavHost);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}
