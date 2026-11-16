import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// unplugin-swc emits the decorator metadata that Nest's dependency injection reads.
export default defineConfig({
  plugins: [swc.vite()],
  test: {
    include: ['test/**/*.test.ts'],
    testTimeout: 20000,
    // vitest reads `--update-goldens` in the main process only; the test workers
    // see just this variable, so the golden helper reads it from here.
    env: {
      SCRIBA_UPDATE_GOLDENS: process.argv.includes('--update-goldens')
        ? '1'
        : '0',
    },
  },
});
