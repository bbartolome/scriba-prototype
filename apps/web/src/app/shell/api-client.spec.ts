/// <reference types="node" />
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type * as Platform from '@bbartolome/scriba-contracts/platform';
import { createRequire } from 'node:module';
import type { Observable } from 'rxjs';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  expectTypeOf,
  it,
  vi,
} from 'vitest';
import type { ApiClient, ResponseSchema } from './api-client';
import { ApiError, ApiSchemaError, isPlatformErrorBody } from './api-error';
import { API_CLIENT } from './tokens';

// A local schema: it turns { version } into { label }, so its output differs from the raw body.
function versionOf(data: unknown): string | undefined {
  if (typeof data === 'object' && data !== null && 'version' in data) {
    const version = data.version;
    return typeof version === 'string' ? version : undefined;
  }
  return undefined;
}

const labelSchema: ResponseSchema<{ label: string }> = {
  safeParse(data) {
    const version = versionOf(data);
    return version === undefined
      ? { success: false, error: 'version is not a string' }
      : { success: true, data: { label: `v${version}` } };
  },
};

// Type-level check: step 8 compiles it. It is exported so that no-unused-vars does not flag it;
// no test calls it, and it emits nothing at runtime.
declare const healthzSchema: typeof Platform.healthzSchema;
export function checkHealthzType(client: ApiClient): void {
  expectTypeOf(client.get('/healthz', healthzSchema)).toEqualTypeOf<
    Observable<Platform.Healthz>
  >();
}

// Collects what an observable emits and how it fails.
function observe<T>(source: Observable<T>): { values: T[]; errors: unknown[] } {
  const outcome: { values: T[]; errors: unknown[] } = {
    values: [],
    errors: [],
  };
  source.subscribe({
    next: (value) => outcome.values.push(value),
    error: (error: unknown) => outcome.errors.push(error),
  });
  return outcome;
}

describe('HttpApiClient', () => {
  let client: ApiClient;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'setup', children: [] }]),
      ],
    });
    client = TestBed.inject(API_CLIENT);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    http.verify();
  });

  // T1
  it('emits the schema output for a valid response', () => {
    const outcome = observe(client.get('/healthz', labelSchema));

    http.expectOne('/healthz').flush({ version: '1.2.3' });

    expect(outcome.values).toEqual([{ label: 'v1.2.3' }]);
    expect(outcome.errors).toEqual([]);
  });

  // T2
  it('maps a Platform error body to an ApiError', () => {
    const outcome = observe(client.get('/healthz', labelSchema));

    http.expectOne('/healthz').flush(
      {
        error: {
          code: 'PLATFORM_NOT_FOUND',
          message: 'Not found.',
          details: { x: 1 },
        },
      },
      { status: 404, statusText: 'Not Found' },
    );

    expect(outcome.errors[0]).toBeInstanceOf(ApiError);
    expect(outcome.errors[0]).toMatchObject({
      status: 404,
      code: 'PLATFORM_NOT_FOUND',
      message: 'Not found.',
      details: { x: 1 },
    });
  });

  // T3
  it('reports a schema mismatch as an ApiSchemaError, not an ApiError', () => {
    const outcome = observe(client.get('/healthz', labelSchema));

    http.expectOne('/healthz').flush({ version: 7 });

    expect(outcome.errors[0]).toBeInstanceOf(ApiSchemaError);
    expect(outcome.errors[0]).not.toBeInstanceOf(ApiError);
    expect(outcome.errors[0]).toMatchObject({ path: '/healthz' });
  });

  // T4
  it('reports a 2xx body that is not JSON as an ApiSchemaError', () => {
    const outcome = observe(client.get('/healthz', labelSchema));

    http
      .expectOne('/healthz')
      .error(new ProgressEvent('error'), { status: 200, statusText: 'OK' });

    expect(outcome.errors[0]).toBeInstanceOf(ApiSchemaError);
  });

  // T5
  it('reports a network failure as ApiError with status 0 and CLIENT_NETWORK', () => {
    const outcome = observe(client.get('/healthz', labelSchema));

    http.expectOne('/healthz').error(new ProgressEvent('error'));

    expect(outcome.errors[0]).toBeInstanceOf(ApiError);
    expect(outcome.errors[0]).toMatchObject({
      status: 0,
      code: 'CLIENT_NETWORK',
    });
  });

  // T6
  it('reports a non-Platform error body as CLIENT_UNEXPECTED_RESPONSE', () => {
    const outcome = observe(client.get('/healthz', labelSchema));

    http
      .expectOne('/healthz')
      .flush('<html>', { status: 502, statusText: 'Bad Gateway' });

    expect(outcome.errors[0]).toBeInstanceOf(ApiError);
    expect(outcome.errors[0]).toMatchObject({
      status: 502,
      code: 'CLIENT_UNEXPECTED_RESPONSE',
    });
  });

  // T7
  it('sends a 401 to /setup and still fails the call with an ApiError', async () => {
    const outcome = observe(client.get('/healthz', labelSchema));

    http
      .expectOne('/healthz')
      .flush(
        { error: { code: 'AUTH_REQUIRED', message: 'Sign in again.' } },
        { status: 401, statusText: 'Unauthorized' },
      );

    await vi.waitFor(
      () => {
        expect(router.url).toBe('/setup');
      },
      { timeout: 5000 },
    );
    expect(outcome.errors[0]).toBeInstanceOf(ApiError);
    expect(outcome.errors[0]).toMatchObject({ status: 401 });
  }, 10000);

  // T8
  it('does not navigate for other errors', async () => {
    const outcome = observe(client.get('/healthz', labelSchema));

    http.expectOne('/healthz').flush(
      {
        error: {
          code: 'PLATFORM_INTERNAL',
          message: 'Internal server error.',
        },
      },
      { status: 500, statusText: 'Internal Server Error' },
    );

    expect(outcome.errors[0]).toBeInstanceOf(ApiError);
    expect(outcome.errors[0]).toMatchObject({ status: 500 });
    // Give a navigation the chance to start; none must.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(router.url).toBe('/');
  });

  // T9
  it('sends same-origin requests with credentials and no auth headers', () => {
    client.get('/healthz', labelSchema).subscribe();
    const get = http.expectOne('/healthz');
    expect(get.request.withCredentials).toBe(true);
    expect(get.request.url).toMatch(/^\/(?!\/)/);
    expect(get.request.headers.keys()).toEqual([]);
    get.flush({ version: '1.2.3' });

    client.post('/api/platform/echo', { count: 0 }, labelSchema).subscribe();
    const post = http.expectOne('/api/platform/echo');
    expect(post.request.withCredentials).toBe(true);
    expect(post.request.url).toMatch(/^\/(?!\/)/);
    expect(post.request.body).toEqual({ count: 0 });
    expect(
      post.request.headers
        .keys()
        .filter((name) => /^(authorization|cookie|x-)/i.test(name)),
    ).toEqual([]);
    post.flush({ version: '1.2.3' });
  });

  // T10
  it('refuses a protocol-relative path before any request is made', () => {
    expect(() => client.get('//evil.example/x', labelSchema)).toThrow(
      TypeError,
    );
    expect(http.match(() => true)).toHaveLength(0);
  });
});

// T11: the guard agrees with the contracts' errorBodySchema, loaded from the built dist.
describe('isPlatformErrorBody', () => {
  const nodeRequire = createRequire(import.meta.url);
  const { errorBodySchema } = nodeRequire(
    '@bbartolome/scriba-contracts/platform',
  ) as typeof Platform;

  // Valid fixtures. Their codes carry a Platform prefix, so both sides accept them.
  const valid: unknown[] = [
    { error: { code: 'PLATFORM_NOT_FOUND', message: 'Not found.' } },
    {
      error: {
        code: 'PLATFORM_INTERNAL',
        message: 'Internal server error.',
        details: { a: 1 },
      },
    },
  ];
  // Invalid fixtures. The one known difference, a code without a Platform prefix (the guard
  // accepts it and the schema rejects it), is left out on purpose.
  const invalid: unknown[] = [
    null,
    'text',
    {},
    { error: {} },
    { error: { code: 1, message: 'm' } },
    { error: { code: 'PLATFORM_NOT_FOUND' } },
    { error: 'PLATFORM_NOT_FOUND' },
  ];

  it('agrees with errorBodySchema on every fixture', () => {
    // The valid fixtures are accepted on both sides, so the parity check cannot pass by
    // rejecting everything.
    for (const fixture of valid) {
      expect(errorBodySchema.safeParse(fixture).success).toBe(true);
      expect(isPlatformErrorBody(fixture)).toBe(true);
    }
    for (const fixture of invalid) {
      expect(isPlatformErrorBody(fixture), JSON.stringify(fixture)).toBe(
        errorBodySchema.safeParse(fixture).success,
      );
    }
  });
});
