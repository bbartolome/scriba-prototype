import type {
  Healthz,
  VersionInfo,
} from '@bbartolome/scriba-contracts/platform';
import type { ResponseSchema } from './api-client';

// Hand-written copies of the platform's version and health schemas, for the landing's reads. The
// Shell ships no runtime zod; platform-copies.spec.ts (E8) checks them against the contract.

/** Platform's version route (`VERSION_ROUTE` in http.ts). */
export const VERSION_PATH = '/api/platform/version';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value !== '';
}

// `z.number().int()` accepts every safe integer, 0 and negatives included.
function isSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

/** Response of GET /api/platform/version (`versionInfoSchema`). */
export const versionInfoCopy: ResponseSchema<VersionInfo> = {
  safeParse(data) {
    const fields: Record<string, unknown> = isRecord(data) ? data : {};
    const { version, revision, builtAt, composeVersion } = fields;
    if (
      isNonEmptyString(version) &&
      isNonEmptyString(revision) &&
      isNonEmptyString(builtAt) &&
      isSafeInteger(composeVersion)
    ) {
      return {
        success: true,
        data: { version, revision, builtAt, composeVersion },
      };
    }
    return { success: false, error: 'the version fields do not match' };
  },
};

/** Response of GET /healthz (`healthzSchema`). */
export const healthzCopy: ResponseSchema<Healthz> = {
  safeParse(data) {
    const fields: Record<string, unknown> = isRecord(data) ? data : {};
    const { status, version } = fields;
    if (status === 'ok' && isNonEmptyString(version)) {
      return { success: true, data: { status, version } };
    }
    return { success: false, error: 'the health fields do not match' };
  },
};
