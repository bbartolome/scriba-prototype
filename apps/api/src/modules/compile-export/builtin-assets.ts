import { resolve } from 'node:path';

// The built-in files of the standard manuscript layout: the reference DOCX (CEX-11), the EPUB stylesheet (CEX-12)
// and the PDF Typst template (CEX-13).
// They ship in the image under apps/api/assets (D2). The same relative paths resolve from src/modules/compile-export
// (tests, dev) and from dist/modules/compile-export (image), because both are three levels below apps/api.
export const BUILTIN_REFERENCE_DOCX = resolve(
  __dirname,
  '..',
  '..',
  '..',
  'assets',
  'compile-export',
  'reference.docx',
);

export const BUILTIN_EPUB_CSS = resolve(
  __dirname,
  '..',
  '..',
  '..',
  'assets',
  'compile-export',
  'epub.css',
);

export const BUILTIN_TYPST_TEMPLATE = resolve(
  __dirname,
  '..',
  '..',
  '..',
  'assets',
  'compile-export',
  'typst-template.typst',
);
