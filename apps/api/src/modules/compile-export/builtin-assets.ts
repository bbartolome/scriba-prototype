import { resolve } from 'node:path';

// The built-in reference DOCX of the standard manuscript layout. It ships in the image under apps/api/assets (D2).
// The same relative path resolves from src/modules/compile-export (tests, dev) and from dist/modules/compile-export
// (image), because both are three levels below apps/api.
export const BUILTIN_REFERENCE_DOCX = resolve(
  __dirname,
  '..',
  '..',
  '..',
  'assets',
  'compile-export',
  'reference.docx',
);
