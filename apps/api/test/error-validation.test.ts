import { expect, it } from 'vitest';
import {
  echoRequestSchema,
  errorBodySchema,
} from '@bbartolome/scriba-contracts/platform';
import { PlatformModule } from '../src/modules/platform/platform.module';
import { createTestApp } from './create-test-app';
import { ErrorProbeModule, probeSchema } from './error-probe';

it('an invalid body to a test controller using the pipe returns 400 PLATFORM_VALIDATION_FAILED with the Zod issues in details', async () => {
  const app = await createTestApp({
    modules: [PlatformModule, ErrorProbeModule],
  });
  try {
    const response = await fetch(app.baseUrl + '/api/platform/probe/validate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ count: 0 }),
    });
    expect(response.status).toBe(400);
    const body: unknown = await response.json();
    expect(() => errorBodySchema.parse(body)).not.toThrow();
    const parsed = errorBodySchema.parse(body);
    expect(parsed.error.code).toBe('PLATFORM_VALIDATION_FAILED');
    const issues = JSON.parse(
      JSON.stringify(probeSchema.safeParse({ count: 0 }).error!.issues),
    );
    expect(parsed.error.details).toEqual(issues);
    const details = parsed.error.details as Array<{ path: unknown }>;
    expect(details[0].path).toEqual(['count']);

    // The contract-schema route: a 4.6.7 schema through the same pipe and filter branch.
    const contractResponse = await fetch(
      app.baseUrl + '/api/platform/probe/contract',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ count: 0, intervalMs: 0 }),
      },
    );
    expect(contractResponse.status).toBe(400);
    const contractBody: unknown = await contractResponse.json();
    expect(() => errorBodySchema.parse(contractBody)).not.toThrow();
    const contractParsed = errorBodySchema.parse(contractBody);
    expect(contractParsed.error.code).toBe('PLATFORM_VALIDATION_FAILED');
    const contractIssues = JSON.parse(
      JSON.stringify(
        echoRequestSchema.safeParse({ count: 0, intervalMs: 0 }).error!.issues,
      ),
    );
    expect(contractParsed.error.details).toEqual(contractIssues);
  } finally {
    await app.close();
  }
});
