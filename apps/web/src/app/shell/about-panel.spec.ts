import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  HEALTHZ_ROUTE,
  VERSION_ROUTE,
  type Healthz,
  type VersionInfo,
} from '@bbartolome/scriba-contracts/platform';
import { type Observable, map, Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { type ApiPath, parseResponse, type ResponseSchema } from './api-client';
import { ApiError, CLIENT_ERROR_CODES } from './api-error';
import { AboutPanel } from './about-panel';
import { restoreMatchMedia, stubMatchMedia } from './testing/match-media';
import { createShellTestDoubles, FakeApiClient } from './testing/test-doubles';
import { API_CLIENT } from './tokens';

const version = {
  version: '1.2.3',
  revision: 'abc1234',
  builtAt: '2026-11-14T00:00:00Z',
  composeVersion: 1,
} satisfies VersionInfo;

const healthy = { status: 'ok', version: '1.2.3' } satisfies Healthz;

@Component({
  imports: [AboutPanel],
  template: '<app-about-panel />',
})
class Host {}

/** A fake that holds the version and health reads separately, each released by the test. */
class HoldingReads extends FakeApiClient {
  readonly versionReply = new Subject<unknown>();
  readonly healthReply = new Subject<unknown>();

  override get<T>(
    path: ApiPath,
    schema: ResponseSchema<T>,
    params?: Record<string, string>,
  ): Observable<T> {
    const reply =
      path === VERSION_ROUTE
        ? this.versionReply
        : path === HEALTHZ_ROUTE
          ? this.healthReply
          : undefined;
    if (reply === undefined) return super.get(path, schema, params);
    this.requests.push({ method: 'GET', path });
    return reply.pipe(map((body) => parseResponse(path, schema, body)));
  }
}

function statusCount(root: HTMLElement): number {
  return root.querySelectorAll('[role="status"]').length;
}

/** The text of the `dd` after the `dt` with the given label, trimmed. */
function valueOf(root: HTMLElement, label: string): string | undefined {
  const term = [...root.querySelectorAll('dt')].find(
    (dt) => dt.textContent?.trim() === label,
  );
  return term?.nextElementSibling?.textContent?.trim();
}

beforeEach(() => {
  stubMatchMedia(1280, 800);
});

afterEach(() => {
  restoreMatchMedia();
});

describe('about panel', () => {
  it('A2 shows each value its own skeleton until its read is released', () => {
    const doubles = createShellTestDoubles();
    const reads = new HoldingReads();
    TestBed.configureTestingModule({
      imports: [Host],
      providers: [
        ...doubles.providers,
        { provide: API_CLIENT, useValue: reads },
      ],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    // Version and revision share one read, and health has its own: three skeletons.
    expect(statusCount(root)).toBe(3);

    reads.healthReply.next(healthy);
    fixture.detectChanges();
    expect(statusCount(root)).toBe(2);
    expect(valueOf(root, 'Health')).toBe('ok');
    expect(valueOf(root, 'Version')).toBe('Loading');

    reads.versionReply.next(version);
    fixture.detectChanges();
    expect(statusCount(root)).toBe(0);
    expect(valueOf(root, 'Version')).toBe('1.2.3');
    expect(valueOf(root, 'Revision')).toBe('abc1234');
  });

  it('A3 keeps the version and revision when the health read fails', () => {
    const doubles = createShellTestDoubles();
    doubles.api.respond('GET', VERSION_ROUTE, version);
    doubles.api.fail(
      'GET',
      HEALTHZ_ROUTE,
      new ApiError(
        0,
        CLIENT_ERROR_CODES.NETWORK,
        'Could not reach the server.',
      ),
    );
    TestBed.configureTestingModule({
      imports: [Host],
      providers: doubles.providers,
    });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    expect(valueOf(root, 'Version')).toBe('1.2.3');
    expect(valueOf(root, 'Revision')).toBe('abc1234');
    expect(root.querySelector('[role="alert"]')?.textContent).toContain(
      'Could not reach the server.',
    );
  });
});
