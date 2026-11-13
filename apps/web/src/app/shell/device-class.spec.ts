import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from '../app';
import { APP_ROUTES } from '../app.routes';
import { withDeviceGate } from './device-class';
import { SseClient } from './sse-client';
import { restoreMatchMedia, stubMatchMedia } from './testing/match-media';
import { SSE_CLIENT } from './tokens';

@Component({
  template: '<p>probe tablet view</p><input aria-label="Draft" />',
})
class TabletView {}

const probes = withDeviceGate([
  {
    path: 'tablet-view',
    data: {
      scope: 'app',
      minDeviceClass: 'tablet',
      nav: { label: 'Tablet view', icon: 'tablet', order: 2 },
    },
    component: TabletView,
  },
]);

let resize: (width: number, height: number) => void;

beforeEach(() => {
  resize = stubMatchMedia(820, 1180);
});

afterEach(() => {
  restoreMatchMedia();
});

async function render(): Promise<ComponentFixture<App>> {
  await TestBed.configureTestingModule({
    imports: [App],
    providers: [
      { provide: SSE_CLIENT, useClass: SseClient },
      provideRouter([...probes, ...APP_ROUTES]),
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(App);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

/** Waits for the CDK's debounced change, then renders it. */
async function settle(fixture: ComponentFixture<App>): Promise<void> {
  await new Promise((done) => setTimeout(done, 10));
  fixture.detectChanges();
  await fixture.whenStable();
}

/** Renders the App on a tablet and opens the tablet view there. */
async function openTabletView(): Promise<ComponentFixture<App>> {
  const fixture = await render();
  await TestBed.inject(Router).navigateByUrl('/tablet-view');
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

function rootOf(fixture: ComponentFixture<App>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

/** The banners about the larger screen. The App shows one banner per notice. */
function notices(fixture: ComponentFixture<App>): HTMLElement[] {
  return [
    ...rootOf(fixture).querySelectorAll<HTMLElement>('[role="status"]'),
  ].filter((banner) => banner.textContent?.includes('larger screen'));
}

function dismissButton(banner: HTMLElement): HTMLButtonElement {
  const button = banner.querySelector('button');
  if (!button) throw new Error('no Dismiss button');
  return button;
}

describe('device class notice', () => {
  it('D1 keeps the open view and its unsaved text on a phone, and shows one notice', async () => {
    const fixture = await openTabletView();
    const field = rootOf(fixture).querySelector('input');
    if (!field) throw new Error('no draft field');
    field.value = 'unsaved draft';

    resize(390, 844);
    await settle(fixture);

    expect(rootOf(fixture).textContent).toContain('probe tablet view');
    expect(rootOf(fixture).querySelector('input')?.value).toBe('unsaved draft');
    expect(notices(fixture)).toHaveLength(1);
  });

  it('D2 stays dismissed while the device stays below the class', async () => {
    const fixture = await openTabletView();
    resize(390, 844);
    await settle(fixture);
    const banner = notices(fixture)[0];
    if (!banner) throw new Error('no notice');

    dismissButton(banner).click();
    fixture.detectChanges();
    expect(notices(fixture)).toHaveLength(0);

    resize(380, 844);
    await settle(fixture);
    expect(notices(fixture)).toHaveLength(0);
  });

  it('D3 removes the notice when the device is back at the class, and keeps the view', async () => {
    const fixture = await openTabletView();
    resize(390, 844);
    await settle(fixture);
    const banner = notices(fixture)[0];
    if (!banner) throw new Error('no notice');
    dismissButton(banner).click();
    fixture.detectChanges();

    resize(820, 1180);
    await settle(fixture);

    expect(notices(fixture)).toHaveLength(0);
    expect(rootOf(fixture).textContent).toContain('probe tablet view');
  });

  it('D4 clears the notice when the user navigates away from the gated view', async () => {
    const fixture = await openTabletView();
    resize(390, 844);
    await settle(fixture);
    expect(notices(fixture)).toHaveLength(1);

    await TestBed.inject(Router).navigateByUrl('/');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(notices(fixture)).toHaveLength(0);
    expect(rootOf(fixture).textContent).toContain('Scriba is running.');
  });
});
