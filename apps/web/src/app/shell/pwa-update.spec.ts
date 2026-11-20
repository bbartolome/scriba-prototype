import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SwUpdate, type VersionEvent } from '@angular/service-worker';
import { describe, expect, it, vi } from 'vitest';
import { Subject } from 'rxjs';
import { NoticeBanners } from './notice-banners';
import { PAGE_RELOAD, PwaUpdate } from './pwa-update';

const readyEvent: VersionEvent = {
  type: 'VERSION_READY',
  currentVersion: { hash: 'a', appData: undefined },
  latestVersion: { hash: 'b', appData: undefined },
} as VersionEvent;

type Fake = {
  isEnabled: boolean;
  versionUpdates: Subject<VersionEvent>;
  checkForUpdate: ReturnType<typeof vi.fn>;
  activateUpdate: ReturnType<typeof vi.fn>;
};

function setup(isEnabled = true): {
  fake: Fake;
  reload: ReturnType<typeof vi.fn>;
  fixture: ComponentFixture<NoticeBanners>;
} {
  const fake: Fake = {
    isEnabled,
    versionUpdates: new Subject<VersionEvent>(),
    checkForUpdate: vi.fn(() => Promise.resolve(false)),
    activateUpdate: vi.fn(() => Promise.resolve()),
  };
  const reload = vi.fn();
  TestBed.configureTestingModule({
    imports: [NoticeBanners],
    providers: [
      { provide: SwUpdate, useValue: fake },
      { provide: PAGE_RELOAD, useValue: reload },
    ],
  });
  TestBed.inject(PwaUpdate).start();
  const fixture = TestBed.createComponent(NoticeBanners);
  fixture.detectChanges();
  return { fake, reload, fixture };
}

function updateBanners(
  fixture: ComponentFixture<NoticeBanners>,
): HTMLElement[] {
  return [
    ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(
      '[role="status"]',
    ),
  ].filter((element) =>
    element.textContent?.includes('A new version of Scriba is ready.'),
  );
}

describe('PwaUpdate', () => {
  it('shows the update banner with a Reload button when a version is ready', () => {
    const { fake, fixture } = setup();
    fake.versionUpdates.next(readyEvent);
    fixture.detectChanges();

    const [banner] = updateBanners(fixture);
    expect(banner?.textContent).toContain('A new version of Scriba is ready.');
    const reloadButton = [...banner!.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === 'Reload',
    );
    expect(reloadButton).toBeDefined();
  });

  it('Reload activates the update, then reloads the page once', async () => {
    const { fake, reload, fixture } = setup();
    fake.versionUpdates.next(readyEvent);
    fixture.detectChanges();

    const button = [
      ...updateBanners(fixture)[0]!.querySelectorAll('button'),
    ].find((candidate) => candidate.textContent?.trim() === 'Reload')!;
    button.click();
    expect(fake.activateUpdate).toHaveBeenCalledTimes(1);
    expect(reload).not.toHaveBeenCalled();

    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
  });

  it('a second version ready leaves one update banner', () => {
    const { fake, fixture } = setup();
    fake.versionUpdates.next(readyEvent);
    fake.versionUpdates.next(readyEvent);
    fixture.detectChanges();

    expect(updateBanners(fixture)).toHaveLength(1);
  });

  it('posts nothing when the worker is not enabled', () => {
    const { fake, fixture } = setup(false);
    fake.versionUpdates.next(readyEvent);
    fixture.detectChanges();

    expect(updateBanners(fixture)).toHaveLength(0);
  });
});
