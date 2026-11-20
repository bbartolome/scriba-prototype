import { DestroyRef, inject, Injectable, InjectionToken } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { NoticesService } from './notices';

/** Reloads the page after a new bundle is active. A test replaces it. */
export const PAGE_RELOAD = new InjectionToken<() => void>('PAGE_RELOAD', {
  providedIn: 'root',
  factory: () => () => document.location.reload(),
});

const UPDATE_CHECK_MS = 15 * 60 * 1000;

/**
 * Prompts a reload when the server has a new bundle, so an open installed app runs it.
 * The worker checks when the app is opened. This also checks when the page becomes visible,
 * when it is shown again, and every 15 minutes while it is open.
 */
@Injectable({ providedIn: 'root' })
export class PwaUpdate {
  private readonly swUpdate = inject(SwUpdate);
  private readonly notices = inject(NoticesService);
  private readonly reload = inject(PAGE_RELOAD);
  private readonly destroyRef = inject(DestroyRef);

  start(): void {
    if (!this.swUpdate.isEnabled) return;

    const subscription = this.swUpdate.versionUpdates.subscribe((event) => {
      if (event.type !== 'VERSION_READY') return;
      this.notices.postBanner({
        key: 'pwa-update',
        message: 'A new version of Scriba is ready.',
        dismissible: true,
        action: { label: 'Reload', run: () => void this.activate() },
      });
    });

    const check = (): void => {
      this.swUpdate.checkForUpdate().catch(() => undefined);
    };
    const onVisibility = (): void => {
      if (document.visibilityState === 'visible') check();
    };
    const timer = setInterval(check, UPDATE_CHECK_MS);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pageshow', check);

    this.destroyRef.onDestroy(() => {
      subscription.unsubscribe();
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pageshow', check);
    });
  }

  private async activate(): Promise<void> {
    await this.swUpdate.activateUpdate();
    this.reload();
  }
}
