import {
  APP_DEFAULT_ROUTE,
  PROVIDERS_EXAMPLES,
  PROVIDERS_ROUTE,
  appDefaultSchema,
  providerListSchema,
} from '@bbartolome/scriba-contracts/providers';
import { describe, expect, it } from 'vitest';
import {
  APP_DEFAULT_PATH,
  PROVIDERS_PATH,
  appDefaultCopy,
  isUsable,
  providerIdsCopy,
} from './providers-copy';

// The examples of the contract, plus the empty list and the ids-only shapes. The copy reads only the
// ids of the list, so the samples below are the ones the step can receive.
const listAccepted: unknown[] = [
  PROVIDERS_EXAMPLES.providerList,
  { providers: [] },
];

const listRefused: unknown[] = [
  {},
  { providers: 'ollama' },
  { providers: [{}] },
  { providers: [{ id: '' }] },
];

const appDefaultAccepted: unknown[] = [
  PROVIDERS_EXAMPLES.appDefault,
  PROVIDERS_EXAMPLES.appDefaultUnset,
];

const appDefaultRefused: unknown[] = [
  {},
  { appDefault: { model: 'llama3.1' } },
  { appDefault: { providerId: '', model: '' } },
  { appDefault: { providerId: 'ollama', model: 1 } },
];

describe('P7 the copies of the two providers reads', () => {
  it('P7 the copies of the two providers reads agree with the contract on each case', () => {
    expect(PROVIDERS_PATH).toBe(PROVIDERS_ROUTE);
    expect(APP_DEFAULT_PATH).toBe(APP_DEFAULT_ROUTE);

    for (const sample of [...listAccepted, ...listRefused]) {
      expect(providerIdsCopy.safeParse(sample).success).toBe(
        providerListSchema.safeParse(sample).success,
      );
    }
    for (const sample of listAccepted) {
      expect(providerListSchema.safeParse(sample).success).toBe(true);
      expect(providerIdsCopy.safeParse(sample).success).toBe(true);
    }
    for (const sample of listRefused) {
      expect(providerListSchema.safeParse(sample).success).toBe(false);
      expect(providerIdsCopy.safeParse(sample).success).toBe(false);
    }

    for (const sample of [...appDefaultAccepted, ...appDefaultRefused]) {
      expect(appDefaultCopy.safeParse(sample).success).toBe(
        appDefaultSchema.safeParse(sample).success,
      );
    }
    for (const sample of appDefaultAccepted) {
      expect(appDefaultSchema.safeParse(sample).success).toBe(true);
      expect(appDefaultCopy.safeParse(sample)).toEqual({
        success: true,
        data: sample,
      });
    }
    for (const sample of appDefaultRefused) {
      expect(appDefaultSchema.safeParse(sample).success).toBe(false);
      expect(appDefaultCopy.safeParse(sample).success).toBe(false);
    }
  });

  it('P7 the ids copy keeps only the ids of the listed providers', () => {
    expect(providerIdsCopy.safeParse(PROVIDERS_EXAMPLES.providerList)).toEqual({
      success: true,
      data: { providers: [{ id: 'ollama' }, { id: 'openrouter' }] },
    });
  });

  it('P7 isUsable is true only when the app default names a listed provider', () => {
    const list = providerIdsCopy.safeParse(PROVIDERS_EXAMPLES.providerList);
    const empty = providerIdsCopy.safeParse({ providers: [] });
    const set = appDefaultCopy.safeParse(PROVIDERS_EXAMPLES.appDefault);
    const unset = appDefaultCopy.safeParse(PROVIDERS_EXAMPLES.appDefaultUnset);
    if (!list.success || !empty.success || !set.success || !unset.success) {
      throw new Error('The samples of the copies must parse.');
    }

    expect(isUsable(list.data, set.data)).toBe(true);
    expect(isUsable(list.data, unset.data)).toBe(false);
    expect(isUsable(empty.data, set.data)).toBe(false);
  });
});
