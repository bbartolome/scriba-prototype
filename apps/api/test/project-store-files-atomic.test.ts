import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it, vi } from 'vitest';
import type * as FS from 'node:fs';
import { bookLibrary, writeFile } from './project-store-files.kit';
import { errorOf, withProjectsApp } from './project-store-projects.kit';

// The state of the one cut write. vi.hoisted runs before the mock factory below, so the factory and the test share it.
const cut = vi.hoisted(() => ({ armed: false, target: '' }));

// Only writeFileSync is replaced. When the flag is armed, the next call writes the first half of its bytes with the
// original function, disarms the flag and throws EIO. Every other call, and every other function, is the original.
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof FS>();
  return {
    ...actual,
    writeFileSync: (...args: Parameters<typeof actual.writeFileSync>): void => {
      if (!cut.armed) return actual.writeFileSync(...args);
      cut.armed = false;
      const [file, data] = args;
      cut.target = String(file);
      const bytes = Buffer.from(data as string);
      actual.writeFileSync(
        file,
        bytes.subarray(0, Math.floor(bytes.length / 2)),
      );
      throw Object.assign(new Error('The write was cut.'), { code: 'EIO' });
    },
  };
});

it('A1: a write cut off half-way leaves the old file, answers 500 with no path, and leaves no stray temp; the next write replaces the file by rename', async () => {
  const fixture = bookLibrary();
  const sources = join(fixture.library, 'book', 'sources');
  const outline = join(sources, 'outline.md');
  try {
    await withProjectsApp(fixture, async (app, cookie) => {
      const listingBefore = readdirSync(sources).sort();
      const inodeBefore = statSync(outline).ino;

      cut.armed = true;
      try {
        const reply = await writeFile(app, cookie, 'book', {
          path: 'sources/outline.md',
          content: '# Outline, the new text that is cut off\n',
        });
        expect(reply.status).toBe(500);
        expect(errorOf(reply).code).toBe('PLATFORM_INTERNAL');
        expect(reply.body).not.toContain(fixture.library);
      } finally {
        cut.armed = false;
      }
      expect(cut.target.endsWith('.tmp')).toBe(true);
      expect(readFileSync(outline, 'utf8')).toBe('# Outline\n');
      expect(readdirSync(sources).sort()).toEqual(listingBefore);

      const saved = await writeFile(app, cookie, 'book', {
        path: 'sources/outline.md',
        content: '# Outline, saved\n',
      });
      expect(saved.status).toBe(200);
      expect(readFileSync(outline, 'utf8')).toBe('# Outline, saved\n');
      expect(statSync(outline).ino).not.toBe(inodeBefore);
      expect(readdirSync(sources).some((name) => name.endsWith('.tmp'))).toBe(
        false,
      );
    });
  } finally {
    fixture.remove();
  }
});
