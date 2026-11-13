import { Component, effect, inject } from '@angular/core';
import { NoticesService } from './notices';
import { SSE_CLIENT } from './tokens';

/** The banner key of the "server unreachable" banner. */
const SERVER_UNREACHABLE_KEY = 'server-unreachable';

/**
 * The connection indicator and the "server unreachable" banner. The label shows while the stream
 * reconnects or is closed, and is hidden while it connects or is open. The banner follows the
 * reachability of the server: posted while a /healthz probe fails, cleared when one succeeds.
 */
@Component({
  selector: 'app-connection-status',
  styles: `
    .status {
      font-size: 0.875rem;
      white-space: nowrap;
    }
  `,
  template: `
    @switch (connectionState()) {
      @case ('reconnecting') {
        <span class="status" role="status" data-state="reconnecting"
          >Reconnecting</span
        >
      }
      @case ('closed') {
        <span class="status" role="status" data-state="closed"
          >Connection lost, retrying</span
        >
      }
    }
  `,
})
export class ConnectionStatus {
  private readonly client = inject(SSE_CLIENT);
  private readonly notices = inject(NoticesService);
  protected readonly connectionState = this.client.connectionState;

  constructor() {
    effect(() => {
      if (this.client.serverReachable()) {
        this.notices.clearBanner(SERVER_UNREACHABLE_KEY);
      } else {
        this.notices.postBanner({
          key: SERVER_UNREACHABLE_KEY,
          message: 'Server unreachable',
        });
      }
    });
  }
}
