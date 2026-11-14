import { Injectable, signal } from '@angular/core';

// Red-run stub: the signature only. The behaviour comes in the implementation commit.
@Injectable({ providedIn: 'root' })
export class ActiveProjectSignal {
  readonly projectId = signal<string | undefined>(undefined);
}
