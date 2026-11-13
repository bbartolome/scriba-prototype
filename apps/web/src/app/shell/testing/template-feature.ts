import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import type { Routes } from '@angular/router';
import { filter, map } from 'rxjs';
import type { ResponseSchema } from '../api-client';
import { API_CLIENT, SSE_CLIENT } from '../tokens';

// The response of GET /api/platform/version, as the template reads it. The Shell ships no runtime
// zod, so a feature that copies this file imports its own contract schema instead.
const versionSchema: ResponseSchema<{ version: string }> = {
  safeParse(data) {
    const version =
      typeof data === 'object' && data !== null && 'version' in data
        ? data['version']
        : undefined;
    return typeof version === 'string'
      ? { success: true, data: { version } }
      : { success: false, error: 'version is not a string' };
  },
};

// The `seq` of a platform/echo envelope, or undefined when the data has no numeric seq.
function echoSeq(data: unknown): number | undefined {
  if (typeof data !== 'object' || data === null || !('seq' in data)) {
    return undefined;
  }
  const seq = data['seq'];
  return typeof seq === 'number' ? seq : undefined;
}

/**
 * The feature template. It injects only the Shell's two tokens, reads only `/api/platform/version`
 * and the `platform` stream, and shows the version and the latest echo's `seq`.
 */
@Component({
  selector: 'app-template-feature',
  template: `
    <p>Platform version: {{ version() ?? 'loading' }}</p>
    <p>Latest echo: {{ latestSeq() ?? 'none' }}</p>
  `,
})
export class TemplateFeaturePage {
  private readonly api = inject(API_CLIENT);
  private readonly events = inject(SSE_CLIENT);

  readonly version = toSignal(
    this.api
      .get('/api/platform/version', versionSchema)
      .pipe(map((info) => info.version)),
  );

  readonly latestSeq = toSignal(
    this.events.stream('platform').pipe(
      filter((envelope) => envelope.type === 'echo'),
      map((envelope) => echoSeq(envelope.data)),
      filter((seq): seq is number => seq !== undefined),
    ),
  );
}

/** The child routes a feature's lazy entry loads. The entry itself is the feature's route table. */
export const templateRoutes: Routes = [
  { path: '', component: TemplateFeaturePage },
];
