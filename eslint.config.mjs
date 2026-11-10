import js from '@eslint/js';
import tseslint from 'typescript-eslint';

// Flat config. The default export is an array so that later units (PLT-09) can add entries.
export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/.angular/**'],
  },
  {
    files: ['**/*.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
  },
);
