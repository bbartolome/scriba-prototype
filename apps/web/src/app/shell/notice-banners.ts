import { Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { NoticesService } from './notices';

/** The app-wide banner area. It renders each banner that features post. */
@Component({
  imports: [MatButton],
  selector: 'app-notice-banners',
  styles: `
    .banner {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.5rem 1rem;
      background: var(--mat-sys-tertiary-container);
      color: var(--mat-sys-on-tertiary-container);
    }
  `,
  template: `
    @for (banner of notices.banners(); track banner.key) {
      <div class="banner" role="status">
        <span>{{ banner.message }}</span>
        @if (banner.dismissible) {
          <button matButton (click)="notices.clearBanner(banner.key)">
            Dismiss
          </button>
        }
      </div>
    }
  `,
})
export class NoticeBanners {
  protected readonly notices = inject(NoticesService);
}
