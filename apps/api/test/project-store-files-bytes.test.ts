import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import type { FileWriteResult } from '@bbartolome/scriba-contracts/project-store';
import {
  bookLibrary,
  readFile,
  sha256Of,
  writeFile,
} from './project-store-files.kit';
import {
  errorOf,
  readJson,
  withProjectsApp,
} from './project-store-projects.kit';

// Every test builds its own temp library and removes it. Nothing here reads the sample projects.

// Every byte value from 0x00 to 0xFF: it holds 0x00 and bytes that are not UTF-8 text.
const PAYLOAD = Buffer.from(Array.from({ length: 256 }, (_, i) => i));

it('B1: a write with contentBase64 stores the exact bytes (round-trip equal on disk, hash of those bytes), and the read of that file is refused as PROJECT_NOT_TEXT', async () => {
  const fixture = bookLibrary();
  try {
    await withProjectsApp(fixture, async (app, cookie) => {
      const res = await writeFile(app, cookie, 'book', {
        path: 'reference.docx',
        content: '',
        contentBase64: PAYLOAD.toString('base64'),
      });
      expect(res.status).toBe(200);
      expect(readJson<FileWriteResult>(res).hash).toBe(sha256Of(PAYLOAD));

      expect(
        Buffer.compare(
          readFileSync(join(fixture.library, 'book', 'reference.docx')),
          PAYLOAD,
        ),
      ).toBe(0);

      const read = await readFile(app, cookie, 'book', 'reference.docx');
      expect(read.status).toBe(415);
      expect(errorOf(read).code).toBe('PROJECT_NOT_TEXT');
    });
  } finally {
    fixture.remove();
  }
});

it('B2: a bytes write to project.yaml that is not text is refused with PROJECT_INVALID, and project.yaml is unchanged', async () => {
  const fixture = bookLibrary();
  const yaml = join(fixture.library, 'book', 'project.yaml');
  try {
    await withProjectsApp(fixture, async (app, cookie) => {
      const before = readFileSync(yaml);
      const res = await writeFile(app, cookie, 'book', {
        path: 'project.yaml',
        content: '',
        contentBase64: PAYLOAD.toString('base64'),
      });
      expect(res.status).toBe(422);
      expect(errorOf(res).code).toBe('PROJECT_INVALID');
      expect(Buffer.compare(readFileSync(yaml), before)).toBe(0);
    });
  } finally {
    fixture.remove();
  }
});

it('B3: a bytes write whose baseHash is not the disk hash is refused with PROJECT_WRITE_CONFLICT, and the disk is unchanged', async () => {
  const fixture = bookLibrary();
  const file = join(fixture.library, 'book', 'reference.docx');
  try {
    await withProjectsApp(fixture, async (app, cookie) => {
      writeFileSync(file, Buffer.from([9, 9, 9]));
      const res = await writeFile(app, cookie, 'book', {
        path: 'reference.docx',
        content: '',
        contentBase64: PAYLOAD.toString('base64'),
        baseHash: sha256Of(Buffer.from('not the disk bytes')),
      });
      expect(res.status).toBe(409);
      expect(errorOf(res).code).toBe('PROJECT_WRITE_CONFLICT');
      expect(Buffer.compare(readFileSync(file), Buffer.from([9, 9, 9]))).toBe(
        0,
      );
    });
  } finally {
    fixture.remove();
  }
});

it('B4: a contentBase64 that is not canonical base64 is refused with PLATFORM_VALIDATION_FAILED, and no file is created', async () => {
  const fixture = bookLibrary();
  try {
    await withProjectsApp(fixture, async (app, cookie) => {
      const res = await writeFile(app, cookie, 'book', {
        path: 'reference.docx',
        content: '',
        contentBase64: 'AAE=!',
      });
      expect(res.status).toBe(400);
      expect(errorOf(res).code).toBe('PLATFORM_VALIDATION_FAILED');
      expect(existsSync(join(fixture.library, 'book', 'reference.docx'))).toBe(
        false,
      );
    });
  } finally {
    fixture.remove();
  }
});

it('B5: with contentBase64 present, content is ignored: the disk holds the decoded bytes', async () => {
  const fixture = bookLibrary();
  const file = join(fixture.library, 'book', 'reference.docx');
  try {
    await withProjectsApp(fixture, async (app, cookie) => {
      const res = await writeFile(app, cookie, 'book', {
        path: 'reference.docx',
        content: 'ignored',
        contentBase64: 'AAE=',
      });
      expect(res.status).toBe(200);
      expect(Buffer.compare(readFileSync(file), Buffer.from([0, 1]))).toBe(0);
    });
  } finally {
    fixture.remove();
  }
});
