import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import boundaries from 'eslint-plugin-boundaries';
import { defineConfig } from 'eslint/config';

// Flat config. The default export is an array so that later units (PLT-09) can add entries.
export default defineConfig(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.angular/**',
      'lint-fixtures/**',
    ],
  },
  {
    files: ['**/*.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
  },
  {
    files: ['**/*.ts'],
    plugins: { boundaries },
    settings: {
      'import/resolver': {
        node: { extensions: ['.ts', '.mjs', '.js', '.json', '.node'] },
      },
      'boundaries/elements': [
        {
          type: 'api-module',
          pattern: '**/src/modules/*',
          capture: ['module'],
        },
        {
          type: 'web-feature',
          pattern: '**/src/app/features/*',
          capture: ['feature'],
        },
      ],
      'boundaries/files': [
        { category: 'entry', pattern: '**/src/modules/*/*.module.ts' },
        { category: 'entry', pattern: '**/src/app/features/*/*.routes.ts' },
      ],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            // R1: a module (API) or a feature (web) imports another only through its entry file.
            {
              from: { element: { type: 'api-module' } },
              allow: {
                to: {
                  element: { type: 'api-module' },
                  file: { categories: 'entry' },
                },
              },
            },
            {
              from: { element: { type: 'web-feature' } },
              allow: {
                to: {
                  element: { type: 'web-feature' },
                  file: { categories: 'entry' },
                },
              },
            },
            // R2: agent-loop and graph-runner never import each other, not even their entry files.
            // Later policies win, so these disallow the entry files allowed above.
            {
              from: {
                element: {
                  type: 'api-module',
                  captured: { module: 'agent-loop' },
                },
              },
              disallow: {
                to: {
                  element: {
                    type: 'api-module',
                    captured: { module: 'graph-runner' },
                  },
                },
              },
              message:
                'agent-loop and graph-runner never import each other, not even their module files',
            },
            {
              from: {
                element: {
                  type: 'api-module',
                  captured: { module: 'graph-runner' },
                },
              },
              disallow: {
                to: {
                  element: {
                    type: 'api-module',
                    captured: { module: 'agent-loop' },
                  },
                },
              },
              message:
                'agent-loop and graph-runner never import each other, not even their module files',
            },
            {
              from: {
                element: {
                  type: 'web-feature',
                  captured: { feature: 'agent-loop' },
                },
              },
              disallow: {
                to: {
                  element: {
                    type: 'web-feature',
                    captured: { feature: 'graph-runner' },
                  },
                },
              },
              message:
                'agent-loop and graph-runner features never import each other, not even their routes',
            },
            {
              from: {
                element: {
                  type: 'web-feature',
                  captured: { feature: 'graph-runner' },
                },
              },
              disallow: {
                to: {
                  element: {
                    type: 'web-feature',
                    captured: { feature: 'agent-loop' },
                  },
                },
              },
              message:
                'agent-loop and graph-runner features never import each other, not even their routes',
            },
          ],
        },
      ],
    },
  },
);
