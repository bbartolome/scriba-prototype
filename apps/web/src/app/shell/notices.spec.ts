import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../app';
import { NoticesService } from './notices';
import { SseClient } from './sse-client';
import { SSE_CLIENT } from './tokens';

// Renders the whole App. The test acts as a feature: it calls only the public NoticesService.
async function render(): Promise<ComponentFixture<App>> {
  await TestBed.configureTestingModule({
    imports: [App],
    providers: [{ provide: SSE_CLIENT, useClass: SseClient }],
  }).compileComponents();
  const fixture = TestBed.createComponent(App);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

function bannerArea(fixture: ComponentFixture<App>): HTMLElement {
  const area = (
    fixture.nativeElement as HTMLElement
  ).querySelector<HTMLElement>('app-notice-banners');
  if (!area) throw new Error('no banner area');
  return area;
}

function dismissButton(area: HTMLElement): HTMLButtonElement | undefined {
  return [...area.querySelectorAll<HTMLButtonElement>('button')].find(
    (button) => button.textContent?.trim() === 'Dismiss',
  );
}

function overlayText(): string {
  return document.querySelector('.cdk-overlay-container')?.textContent ?? '';
}

describe('notices', () => {
  it('shows a dismissible banner, and its Dismiss button removes it', async () => {
    const fixture = await render();
    TestBed.inject(NoticesService).postBanner({
      key: 'compose',
      message: 'Compose version mismatch',
      dismissible: true,
    });
    fixture.detectChanges();

    expect(bannerArea(fixture).textContent).toContain(
      'Compose version mismatch',
    );
    const button = dismissButton(bannerArea(fixture));
    if (!button) throw new Error('no Dismiss button');
    button.click();
    fixture.detectChanges();

    expect(bannerArea(fixture).textContent).not.toContain(
      'Compose version mismatch',
    );
  });

  it('shows a banner without a Dismiss button, and clearBanner removes it', async () => {
    const fixture = await render();
    const notices = TestBed.inject(NoticesService);
    notices.postBanner({ key: 'server', message: 'Server unreachable' });
    fixture.detectChanges();

    expect(bannerArea(fixture).textContent).toContain('Server unreachable');
    expect(dismissButton(bannerArea(fixture))).toBeUndefined();

    notices.clearBanner('server');
    fixture.detectChanges();

    expect(bannerArea(fixture).textContent).not.toContain('Server unreachable');
  });

  it('shows a snackbar in the overlay, and its Dismiss action closes it within 1 s', async () => {
    const fixture = await render();
    TestBed.inject(NoticesService).postSnackbar('Settings saved');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(overlayText()).toContain('Settings saved');
    const action = [
      ...document.querySelectorAll<HTMLButtonElement>(
        '.cdk-overlay-container button',
      ),
    ].find((button) => button.textContent?.trim() === 'Dismiss');
    if (!action) throw new Error('no snackbar Dismiss action');
    action.click();

    await vi.waitFor(
      () => expect(overlayText()).not.toContain('Settings saved'),
      { timeout: 1000 },
    );
  });
});
