import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  ECHO_ROUTE,
  echoRequestSchema,
  HEALTHZ_ROUTE,
  healthzSchema,
  VERSION_ROUTE,
  versionInfoSchema,
  type SseEnvelope,
} from '@bbartolome/scriba-contracts/platform';
import type { Observable } from 'rxjs';
import { describe, expect, it } from 'vitest';
import type { ResponseSchema } from '../api-client';
import { ApiError, ApiSchemaError } from '../api-error';
import type { ReconcileReason } from '../sse-client';
import { API_CLIENT } from '../tokens';
import { FakeApiClient, FakeEventSource } from './test-doubles';

// What a subscriber saw: each value, and each error.
interface Outcome<T> {
  values: T[];
  errors: unknown[];
}

function observe<T>(source: Observable<T>): Outcome<T> {
  const outcome: Outcome<T> = { values: [], errors: [] };
  source.subscribe({
    next: (value) => outcome.values.push(value),
    error: (error: unknown) => outcome.errors.push(error),
  });
  return outcome;
}

describe('test doubles', () => {
  // T3
  it('rejects a mismatched body for GET and POST with an ApiSchemaError', () => {
    expect(healthzSchema.safeParse({ status: 'ok', version: 7 }).success).toBe(
      false,
    );
    expect(
      echoRequestSchema.safeParse({ count: 1, intervalMs: 0 }).success,
    ).toBe(true);

    const api = new FakeApiClient();
    api.respond('GET', HEALTHZ_ROUTE, { status: 'ok', version: 7 });
    const read = observe(api.get(HEALTHZ_ROUTE, healthzSchema));

    expect(read.errors).toHaveLength(1);
    expect(read.errors[0]).toBeInstanceOf(ApiSchemaError);
    expect(read.errors[0]).not.toBeInstanceOf(ApiError);
    expect(read.errors[0]).toMatchObject({ path: HEALTHZ_ROUTE });

    // A schema that rejects any non-object, so the 202 with no body (null) is a mismatch.
    const acceptedSchema: ResponseSchema<{ accepted: boolean }> = {
      safeParse: (data) =>
        typeof data === 'object' && data !== null
          ? { success: true, data: { accepted: true } }
          : { success: false, error: 'not an object' },
    };
    api.respond('POST', ECHO_ROUTE, null);
    const write = observe(
      api.post(ECHO_ROUTE, { count: 1, intervalMs: 0 }, acceptedSchema),
    );

    expect(write.errors).toHaveLength(1);
    expect(write.errors[0]).toBeInstanceOf(ApiSchemaError);
    expect(write.errors[0]).toMatchObject({ path: ECHO_ROUTE });
    expect(api.requests).toContainEqual({
      method: 'GET',
      path: HEALTHZ_ROUTE,
    });
    expect(api.requests).toContainEqual({
      method: 'POST',
      path: ECHO_ROUTE,
      body: { count: 1, intervalMs: 0 },
    });
  });

  // T4
  it('gives the same ApiSchemaError as the real client for the same body', () => {
    const body = { status: 'ok', version: 7 };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    const real = observe(
      TestBed.inject(API_CLIENT).get(HEALTHZ_ROUTE, healthzSchema),
    );
    http.expectOne(HEALTHZ_ROUTE).flush(body);
    http.verify();

    const fake = new FakeApiClient();
    fake.respond('GET', HEALTHZ_ROUTE, body);
    const canned = observe(fake.get(HEALTHZ_ROUTE, healthzSchema));

    expect(real.errors).toHaveLength(1);
    expect(real.errors[0]).toBeInstanceOf(ApiSchemaError);
    expect(real.errors[0]).toMatchObject({ path: HEALTHZ_ROUTE });
    expect(canned.errors).toHaveLength(1);
    expect(canned.errors[0]).toBeInstanceOf(ApiSchemaError);
    expect(canned.errors[0]).toMatchObject({ path: HEALTHZ_ROUTE });
  });

  // T5
  it('emits an accepted body, parsed', () => {
    const api = new FakeApiClient();
    api.respond('GET', HEALTHZ_ROUTE, { status: 'ok', version: '1.2.3' });

    const read = observe(api.get(HEALTHZ_ROUTE, healthzSchema));

    expect(read.values).toEqual([{ status: 'ok', version: '1.2.3' }]);
    expect(read.errors).toEqual([]);
  });

  // T6
  it('emits a typed error as given, the same instance', () => {
    const api = new FakeApiClient();
    const error = new ApiError(404, 'PLATFORM_NOT_FOUND', 'Not found.', {
      x: 1,
    });
    api.fail('GET', VERSION_ROUTE, error);

    const read = observe(api.get(VERSION_ROUTE, versionInfoSchema));

    expect(read.errors).toHaveLength(1);
    expect(read.errors[0]).toBe(error);
    expect(read.errors[0]).toMatchObject({
      status: 404,
      code: 'PLATFORM_NOT_FOUND',
    });
  });

  // T7
  it('errors with a plain Error for an unregistered route, and records the request', () => {
    const api = new FakeApiClient();

    const read = observe(api.get('/api/none', healthzSchema));

    expect(read.errors).toHaveLength(1);
    expect(read.errors[0]).toBeInstanceOf(Error);
    expect(read.errors[0]).not.toBeInstanceOf(ApiError);
    expect(read.errors[0]).toEqual(
      new Error('No canned response for GET /api/none.'),
    );
    expect(api.requests).toEqual([{ method: 'GET', path: '/api/none' }]);
  });

  // T8
  it('refuses a non-envelope and delivers each envelope to its module only', () => {
    const events = new FakeEventSource();
    const early: SseEnvelope[] = [];
    events.stream('platform').subscribe((envelope) => early.push(envelope));

    expect(() =>
      events.push({
        module: 'not-a-module',
        type: 'x',
        data: {},
      } as unknown as SseEnvelope),
    ).toThrow(new TypeError('Not a Platform envelope.'));
    events.push({
      module: 'platform',
      type: 'echo',
      data: { seq: 1, sentAt: '2026-11-13T00:00:01.000Z' },
    });
    events.push({ module: 'project-store', type: 'pending-created', data: {} });

    expect(early).toEqual([
      {
        module: 'platform',
        type: 'echo',
        data: { seq: 1, sentAt: '2026-11-13T00:00:01.000Z' },
      },
    ]);

    // The stream is hot with no replay: a subscriber attached after the pushes gets nothing.
    const late: SseEnvelope[] = [];
    events.stream('platform').subscribe((envelope) => late.push(envelope));
    expect(late).toEqual([]);
  });

  // T9
  it('fires no tick on drop, and fires reopen and visible in order', () => {
    const events = new FakeEventSource();
    const reasons: ReconcileReason[] = [];
    events.reconcile$.subscribe((reason) => reasons.push(reason));

    events.drop();
    events.reopen();
    events.tick('visible');

    expect(reasons).toEqual(['reopen', 'visible']);
  });
});
