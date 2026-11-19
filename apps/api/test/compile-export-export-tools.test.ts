import { expect, it } from 'vitest';
import { toolStatus } from './compile-export-export.kit';

// Criterion 4 (the flag): a missing required tool is a failure, and a missing optional tool is a skip with a message.
it('criterion 4: a missing pandoc is a failure when the flag is set, and a skip with a message otherwise', () => {
  expect(toolStatus(false, true)).toBe('fail');
  expect(toolStatus(false, false)).toBe('skip');
  expect(toolStatus(true, true)).toBe('run');
  expect(toolStatus(true, false)).toBe('run');
});
