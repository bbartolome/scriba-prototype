import { inject, Injectable, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

/** A banner in the app-wide area. Posting a banner with an existing key replaces it. */
export interface BannerNotice {
  key: string;
  message: string;
  /** A Dismiss button is shown when this is true. Defaults to false. */
  dismissible?: boolean;
  /** An optional button shown before Dismiss. */
  action?: { label: string; run: () => void };
}

/** Banners and snackbars that features post. Root-provided, so any feature can inject it. */
@Injectable({ providedIn: 'root' })
export class NoticesService {
  private readonly snackBar = inject(MatSnackBar);
  private readonly list = signal<readonly BannerNotice[]>([]);

  /** The banners to show, in the order they were first posted. */
  readonly banners = this.list.asReadonly();

  /** Shows a banner, replacing the banner with the same key in place. */
  postBanner(notice: BannerNotice): void {
    this.list.update((all) => {
      const index = all.findIndex((banner) => banner.key === notice.key);
      if (index === -1) return [...all, notice];
      return all.map((banner, i) => (i === index ? notice : banner));
    });
  }

  /** Removes the banner with this key, if there is one. */
  clearBanner(key: string): void {
    this.list.update((all) => all.filter((banner) => banner.key !== key));
  }

  /** Shows a snackbar with a Dismiss action, for 6 seconds. */
  postSnackbar(message: string): void {
    this.snackBar.open(message, 'Dismiss', { duration: 6000 });
  }
}
