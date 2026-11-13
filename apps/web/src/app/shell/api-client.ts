import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, map, Observable, throwError } from 'rxjs';
import {
  ApiError,
  ApiSchemaError,
  CLIENT_ERROR_CODES,
  isPlatformErrorBody,
} from './api-error';

// A same-origin path: one leading slash. Protocol-relative paths are refused at call time.
export type ApiPath = `/${string}`;

// The part of a Zod schema that the client uses. Zod's schemas satisfy it, and the client
// never names zod's own type (the lock has two zod copies).
export interface ResponseSchema<T> {
  safeParse(
    data: unknown,
  ): { success: true; data: T } | { success: false; error: unknown };
}

// The typed API client. Only GET (reads) and POST (commands), as Platform's convention says.
export interface ApiClient {
  get<T>(
    path: ApiPath,
    schema: ResponseSchema<T>,
    params?: Record<string, string>,
  ): Observable<T>;
  post<T>(
    path: ApiPath,
    body: unknown,
    schema: ResponseSchema<T>,
  ): Observable<T>;
}

// Parses a 2xx body. The test fakes use it too, so a mismatch is rejected the same way.
export function parseResponse<T>(
  path: string,
  schema: ResponseSchema<T>,
  body: unknown,
): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new ApiSchemaError(path, result.error);
  }
  return result.data;
}

function assertSameOrigin(path: string): void {
  if (path.startsWith('//')) {
    throw new TypeError(`Refusing a protocol-relative API path: ${path}`);
  }
}

@Injectable({ providedIn: 'root' })
export class HttpApiClient implements ApiClient {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  get<T>(
    path: ApiPath,
    schema: ResponseSchema<T>,
    params?: Record<string, string>,
  ): Observable<T> {
    assertSameOrigin(path);
    return this.http.get<unknown>(path, { withCredentials: true, params }).pipe(
      catchError((error: unknown) =>
        throwError(() => this.toClientError(path, error)),
      ),
      map((body) => parseResponse(path, schema, body)),
    );
  }

  post<T>(
    path: ApiPath,
    body: unknown,
    schema: ResponseSchema<T>,
  ): Observable<T> {
    assertSameOrigin(path);
    return this.http.post<unknown>(path, body, { withCredentials: true }).pipe(
      catchError((error: unknown) =>
        throwError(() => this.toClientError(path, error)),
      ),
      map((response) => parseResponse(path, schema, response)),
    );
  }

  // HTTP errors are mapped here, before the body is parsed, so a parse failure never reaches this.
  private toClientError(path: string, error: unknown): unknown {
    if (!(error instanceof HttpErrorResponse)) {
      return error;
    }
    if (error.status >= 200 && error.status < 300) {
      return new ApiSchemaError(path, 'The response body is not JSON.');
    }
    if (error.status === 0) {
      return new ApiError(
        0,
        CLIENT_ERROR_CODES.NETWORK,
        'Could not reach the server.',
      );
    }
    if (error.status === 401) {
      void this.router.navigateByUrl('/setup');
    }
    if (isPlatformErrorBody(error.error)) {
      const { code, message, details } = error.error.error;
      return new ApiError(error.status, code, message, details);
    }
    return new ApiError(
      error.status,
      CLIENT_ERROR_CODES.UNEXPECTED_RESPONSE,
      'The server sent an unexpected response.',
    );
  }
}
