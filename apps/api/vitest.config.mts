import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// unplugin-swc emits the decorator metadata that Nest's dependency injection reads.
export default defineConfig({
  plugins: [swc.vite()],
  test: {
    include: ['test/**/*.test.ts'],
    testTimeout: 20000,
  },
});
